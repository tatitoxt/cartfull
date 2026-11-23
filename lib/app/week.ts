const DAY_MS = 24 * 60 * 60 * 1000;
/** Weeks are planned on US time so a late-evening shopper does not jump a day. */
const ZONE = "America/Chicago";

/** Today's calendar date in the planning time zone, as YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(now);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekday(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * The Monday a new plan should start on. Monday to Friday plans the current
 * week; on the weekend people shop for the week ahead.
 */
export function targetWeekStart(date: string = today()): string {
  const shifted = addDays(date, 2);
  return addDays(shifted, -weekday(shifted));
}

export function weekLabel(weekStart: string): string {
  const format = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${format(weekStart)} – ${format(addDays(weekStart, 6))}`;
}

export function weekIsOver(weekStart: string, date: string = today()): boolean {
  return date >= addDays(weekStart, 7);
}
