import "server-only";
import { addDays, targetWeekStart, today, weekIsOver, weekLabel } from "@/lib/app/week";
import { firstPlanId, listPlans, loadPlan, type Entitlement, type Session } from "@/lib/app/data";
import type { Profile } from "@/lib/app/profile";
import { fill, MESSAGES } from "@/lib/i18n/messages";

export interface Reminder {
  id: string;
  text: string;
  href: string;
  cta: string;
}

/**
 * In-app reminders, from the notify_* preferences: nudge to plan the next
 * week, finish this week's shopping and log the real spend once the week
 * ends. Each id changes per week so a dismissed banner re-arms itself.
 */
export async function getReminders(session: Session, profile: Profile, entitlement: Entitlement): Promise<Reminder[]> {
  if (!profile.notify_plan && !profile.notify_shopping && !profile.notify_receipt) return [];
  const m = MESSAGES[profile.lang].reminders;
  const date = today();
  const plans = await listPlans(session);
  const firstId = firstPlanId(plans);
  const current = plans.find((p) => p.week_start <= date && !weekIsOver(p.week_start, date));
  const upcoming = plans.find((p) => p.week_start > date);
  const out: Reminder[] = [];

  // Only subscribers can plan ahead, so the nudge is meaningless without one.
  if (profile.notify_plan && entitlement.active && !upcoming && (current ? weekIsOver(addDays(current.week_start, -2), date) : true)) {
    const end = current ? addDays(current.week_start, 6) : date;
    out.push({
      id: `plan-${targetWeekStart(date)}`,
      text: fill(m.planText, { date: weekLabel(end, profile.lang) }),
      href: "/app/plan",
      cta: m.planCta,
    });
  }

  if (profile.notify_shopping && current) {
    const { cart, checked } = await loadPlan(session, current, {
      active: entitlement.active,
      firstId,
    });
    const left = cart.lines.filter((line) => !line.have && !checked.has(line.ingredient.id)).length;
    if (left > 0) {
      out.push({
        id: `shopping-${current.id}-${left}`,
        text: fill(m.shoppingText, { count: left }),
        href: "/app/list",
        cta: m.shoppingCta,
      });
    }
  }

  if (profile.notify_receipt) {
    const finished = plans
      .filter(
        (p) =>
          weekIsOver(p.week_start, date) &&
          addDays(p.week_start, 13) >= date &&
          p.spent_cents == null &&
          (entitlement.active || p.id === firstId),
      )
      .sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
    if (finished) {
      out.push({
        id: `receipt-${finished.id}`,
        text: fill(m.receiptText, { week: weekLabel(finished.week_start, profile.lang) }),
        href: "/app/savings",
        cta: m.receiptCta,
      });
    }
  }

  return out;
}
