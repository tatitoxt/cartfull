"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/components/analytics";
import { ANNUAL_SAVING_PERCENT, PRICING, TRIAL_DAYS, type BillingInterval } from "@/lib/billing/plans";

/**
 * Monthly / yearly toggle with one price in focus. On the landing page the
 * button starts onboarding; inside the app it posts to Stripe Checkout.
 */
export function PricingChoice({ mode, trial = true }: { mode: "landing" | "checkout"; trial?: boolean }) {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const annual = interval === "annual";

  return (
    <div className="mt-8">
      <div role="radiogroup" aria-label="Billing period" className="inline-grid grid-cols-2 rounded-full bg-paper-deep p-1">
        {(["annual", "monthly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={interval === value}
            onClick={() => setInterval(value)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${
              interval === value ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
            }`}
            data-testid={`interval-${value}`}
          >
            {value === "annual" ? `Yearly · save ${ANNUAL_SAVING_PERCENT}%` : "Monthly"}
          </button>
        ))}
      </div>

      <p className="mt-6 flex items-baseline gap-2" aria-live="polite">
        <span className="tnum font-display text-6xl font-semibold leading-none" data-testid="price">
          {annual ? PRICING.annual.label : PRICING.monthly.label}
        </span>
        <span className="text-ink-soft">/ {annual ? "year" : "month"}</span>
      </p>
      <p className="tnum mt-2 text-ink-soft">
        {annual
          ? `That's ${PRICING.annual.perMonthLabel} a month, billed once a year.`
          : "Billed every month. Switch to yearly any time."}
      </p>

      {mode === "checkout" ? (
        <form action="/api/stripe/checkout" method="post" className="mt-6" onSubmit={() => track("checkout_started", { interval })}>
          <input type="hidden" name="interval" value={interval} />
          <button type="submit" className="btn btn-cta w-full sm:w-auto" data-testid="checkout-button">
            {trial ? `Start my ${TRIAL_DAYS}-day free trial` : "Subscribe"}
          </button>
        </form>
      ) : (
        <Link href="/start" className="btn btn-cta mt-6 w-full sm:w-auto" onClick={() => track("cta_clicked", { place: "pricing" })}>
          Plan my week
        </Link>
      )}
      <p className="mt-4 max-w-md text-sm text-ink-soft">
        {mode === "landing"
          ? `Your first week is free, no card needed. After that, ${TRIAL_DAYS} days free, then ${annual ? `${PRICING.annual.label} a year` : `${PRICING.monthly.label} a month`}. Cancel any time.`
          : trial
            ? `Free for ${TRIAL_DAYS} days, then ${annual ? `${PRICING.annual.label} a year` : `${PRICING.monthly.label} a month`}. Cancel any time before the trial ends and you pay nothing.`
            : `${annual ? `${PRICING.annual.label} a year` : `${PRICING.monthly.label} a month`}, charged today. Cancel any time.`}
      </p>
    </div>
  );
}
