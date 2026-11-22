export const TRIAL_DAYS = 7;

export const PRICING = {
  monthly: { cents: 999, label: "$9.99", per: "month" },
  annual: { cents: 4999, label: "$49.99", per: "year", perMonthLabel: "$4.17" },
} as const;

export type BillingInterval = keyof typeof PRICING;

/** Share of the monthly price saved by paying yearly, as a whole percent. */
export const ANNUAL_SAVING_PERCENT = Math.round((1 - PRICING.annual.cents / (PRICING.monthly.cents * 12)) * 100);

/** Statuses that grant access. Everything else is locked out. */
export const ACCESS_STATUSES = ["trialing", "active"] as const;

export function hasAccess(status: string | null | undefined): boolean {
  return ACCESS_STATUSES.includes(status as (typeof ACCESS_STATUSES)[number]);
}
