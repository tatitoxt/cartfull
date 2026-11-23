export const TRIAL_DAYS = 7;

export const PRICING = {
  monthly: { cents: 999, label: "$9.99", per: "month" },
  annual: { cents: 4999, label: "$49.99", per: "year", perMonthLabel: "$4.17" },
} as const;

/** First month's price for new monthly subscribers (rest at full price). */
export const INTRO_MONTHLY_CENTS = 499;

export type BillingInterval = keyof typeof PRICING;

/** Share of the monthly price saved by paying yearly, as a whole percent. */
export const ANNUAL_SAVING_PERCENT = Math.round((1 - PRICING.annual.cents / (PRICING.monthly.cents * 12)) * 100);

/** Statuses that grant access. Everything else is locked out. */
export const ACCESS_STATUSES = ["trialing", "active"] as const;

export function hasAccess(status: string | null | undefined): boolean {
  return ACCESS_STATUSES.includes(status as (typeof ACCESS_STATUSES)[number]);
}

/** Statuses Stripe will never bring back. Anything else may still be collected on. */
const ENDED_STATUSES = ["canceled", "incomplete_expired"];

export function hasEnded(status: string | null | undefined): boolean {
  return !status || ENDED_STATUSES.includes(status);
}

/**
 * Whether a subscription reported by Stripe should replace the stored one.
 * A late event about an old, ended subscription must not overwrite the one
 * the household is on now.
 */
export function replacesStored(
  storedSubscriptionId: string | null | undefined,
  incoming: { id: string; status: string },
): boolean {
  if (!storedSubscriptionId || storedSubscriptionId === incoming.id) return true;
  return !hasEnded(incoming.status);
}
