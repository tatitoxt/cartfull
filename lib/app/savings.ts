import { typicalSpendCents } from "./profile";

export interface SavingsInput {
  id: string;
  week_start: string;
  budget_cents: number;
  usual_spend_cents: number | null;
  household_size: number;
  total_cents: number;
  spent_cents: number | null;
  plan_receipts?: { plan_id: string }[] | null;
}

export interface WeekSavings {
  id: string;
  weekStart: string;
  /** What the shopper says a normal week costs, or a household-size estimate. */
  usualCents: number;
  usualIsEstimate: boolean;
  /**
   * Receipt total when entered. Until then the week is counted at the full
   * budget: the planned meals fit inside it and the rest covers everything the
   * plan does not, so the saving is never overstated.
   */
  spentCents: number;
  spentIsActual: boolean;
  /** Positive when the week cost less than usual. Never clamped: an expensive week shows as negative. */
  savedCents: number;
  budgetCents: number;
  underBudget: boolean;
  /** A receipt photo is attached to the week. */
  hasReceipt: boolean;
}

export interface SavingsSummary {
  weeks: WeekSavings[];
  totalSavedCents: number;
  /** Saved across weeks with a receipt entered. */
  confirmedSavedCents: number;
  confirmedWeeks: number;
  averageSavedCents: number;
  /** Average weekly saving projected over a year. */
  yearlyPaceCents: number;
}

export function weekSavings(plan: SavingsInput): WeekSavings {
  const usualIsEstimate = plan.usual_spend_cents === null;
  const usualCents = plan.usual_spend_cents ?? typicalSpendCents(plan.household_size);
  const spentIsActual = plan.spent_cents !== null;
  const spentCents = plan.spent_cents ?? Math.max(plan.budget_cents, plan.total_cents);
  return {
    id: plan.id,
    weekStart: plan.week_start,
    usualCents,
    usualIsEstimate,
    spentCents,
    spentIsActual,
    savedCents: usualCents - spentCents,
    budgetCents: plan.budget_cents,
    underBudget: spentCents <= plan.budget_cents,
    hasReceipt: (plan.plan_receipts?.length ?? 0) > 0,
  };
}

export function summarizeSavings(plans: readonly SavingsInput[]): SavingsSummary {
  const weeks = plans.map(weekSavings);
  const totalSavedCents = weeks.reduce((sum, w) => sum + w.savedCents, 0);
  const confirmed = weeks.filter((w) => w.spentIsActual);
  const averageSavedCents = weeks.length ? Math.round(totalSavedCents / weeks.length) : 0;
  return {
    weeks,
    totalSavedCents,
    confirmedSavedCents: confirmed.reduce((sum, w) => sum + w.savedCents, 0),
    confirmedWeeks: confirmed.length,
    averageSavedCents,
    yearlyPaceCents: averageSavedCents * 52,
  };
}
