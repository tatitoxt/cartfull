import "server-only";
import { redirect } from "next/navigation";
import {
  firstPlanId,
  getEntitlement,
  getProfile,
  listPlans,
  loadPlan,
  requireSession,
  type Entitlement,
  type LoadedPlan,
  type PlanRow,
  type Session,
} from "./data";
import type { Profile } from "./profile";
import { addDays, today, weekIsOver } from "./week";

export interface AppState {
  session: Session;
  profile: Profile;
  entitlement: Entitlement;
  plans: PlanRow[];
  firstId: string | null;
  /** The week to show: the one in progress, else the newest. */
  current: LoadedPlan | null;
  /** True once the shown week is nearly or fully over, or when there is none. */
  canPlanNext: boolean;
}

/** Everything the signed-in screens need, loaded once per request. */
export async function loadAppState(next: string): Promise<AppState> {
  const session = await requireSession(next);
  const [profile, entitlement, plans] = await Promise.all([
    getProfile(session),
    getEntitlement(session),
    listPlans(session),
  ]);
  if (!profile.onboarded_at) redirect("/start");

  const firstId = firstPlanId(plans);
  const date = today();
  // Prefer the week that contains today; a plan made for next week shows once nothing is in progress.
  const inProgress = plans.find((p) => p.week_start <= date && !weekIsOver(p.week_start, date));
  const upcoming = [...plans].reverse().find((p) => p.week_start > date);
  const row = inProgress ?? upcoming ?? plans[0] ?? null;
  const current = row ? await loadPlan(session, row, { active: entitlement.active, firstId }) : null;

  const newest = plans[0];
  const canPlanNext = !newest || date >= addDays(newest.week_start, 3);
  return { session, profile, entitlement, plans, firstId, current, canPlanNext };
}
