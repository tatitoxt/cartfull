"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/components/analytics";
import { PRICING, TRIAL_DAYS, type BillingInterval } from "@/lib/billing/plans";
import { LANDING, fill, type LandingCopy } from "@/lib/i18n/landing";

/**
 * Monthly / yearly toggle with one price in focus. On the landing page the
 * button starts onboarding; inside the app it posts to Stripe Checkout.
 */
export function PricingChoice({
  mode,
  trial = true,
  copy = LANDING.en.pricing,
}: {
  mode: "landing" | "checkout";
  trial?: boolean;
  copy?: LandingCopy["pricing"];
}) {
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
            {value === "annual" ? copy.yearly : copy.monthly}
          </button>
        ))}
      </div>

      <p className="mt-6 flex items-baseline gap-2" aria-live="polite">
        <span className="tnum font-display text-6xl font-semibold leading-none" data-testid="price">
          {annual ? PRICING.annual.label : PRICING.monthly.label}
        </span>
        <span className="text-ink-soft">{annual ? copy.perYear : copy.perMonth}</span>
      </p>
      <p className="tnum mt-2 text-ink-soft">
        {annual ? copy.yearlyNote : copy.monthlyNote}
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
          {copy.cta}
        </Link>
      )}
      <p className="mt-4 max-w-md text-sm text-ink-soft">
        {mode === "landing"
          ? fill(copy.terms, { price: annual ? copy.yearPrice : copy.monthPrice })
          : trial
            ? `Free for ${TRIAL_DAYS} days, then ${annual ? `${PRICING.annual.label} a year` : `${PRICING.monthly.label} a month`}. Cancel any time before the trial ends and you pay nothing.`
            : `${annual ? `${PRICING.annual.label} a year` : `${PRICING.monthly.label} a month`}, charged today. Cancel any time.`}
      </p>
    </div>
  );
}
