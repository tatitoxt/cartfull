"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/components/analytics";
import { ANNUAL_SAVING_PERCENT, PRICING, TRIAL_DAYS, type BillingInterval } from "@/lib/billing/plans";
import { LANDING, fill, type LandingCopy } from "@/lib/i18n/landing";
import { useLocale, useMessages } from "@/lib/i18n/locale-provider";
import { moneyExact } from "@/lib/format";
import type { Lang } from "@/lib/catalog/localize";

/**
 * Monthly / yearly toggle with one price in focus. On the landing page the
 * button starts onboarding; inside the app it posts to Stripe Checkout.
 */
export function PricingChoice({
  mode,
  trial = true,
  copy = LANDING.en.pricing,
  landingLang,
}: {
  mode: "landing" | "checkout";
  trial?: boolean;
  copy?: LandingCopy["pricing"];
  landingLang?: Lang;
}) {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const annual = interval === "annual";
  const { lang: appLang } = useLocale();
  const lang = mode === "landing" ? landingLang ?? appLang : appLang;
  const m = useMessages();
  const yearlyLabel = mode === "landing" ? copy.yearly : m.billing.annual.replace("{percent}", String(ANNUAL_SAVING_PERCENT));
  const monthlyLabel = mode === "landing" ? copy.monthly : m.billing.monthly;
  const perYear = mode === "landing" ? copy.perYear : m.billing.perYear;
  const perMonth = mode === "landing" ? copy.perMonth : m.billing.perMonth;
  const yearlyNote = mode === "landing"
    ? copy.yearlyNote.replace(PRICING.annual.perMonthLabel, moneyExact(Math.round(PRICING.annual.cents / 12), lang))
    : m.billing.yearlyNote.replace("{amount}", moneyExact(Math.round(PRICING.annual.cents / 12), lang));
  const annualPrice = lang === "es" ? moneyExact(PRICING.annual.cents, lang) : PRICING.annual.label;
  const monthlyPrice = lang === "es" ? moneyExact(PRICING.monthly.cents, lang) : PRICING.monthly.label;
  const monthlyNote = mode === "landing" ? copy.monthlyNote : m.billing.monthlyNote;

  return (
    <div className="mt-8">
      <div role="radiogroup" aria-label={lang === "es" ? "Período de pago" : "Billing period"} className="inline-grid grid-cols-2 rounded-full bg-bg-deep p-1">
        {(["annual", "monthly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={interval === value}
            onClick={() => setInterval(value)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors ${
              interval === value ? "bg-surface text-fg shadow-sm" : "text-fg-soft"
            }`}
            data-testid={`interval-${value}`}
          >
            {value === "annual" ? yearlyLabel : monthlyLabel}
          </button>
        ))}
      </div>

      <p className="mt-6 flex items-baseline gap-2" aria-live="polite">
        <span className="tnum font-display text-6xl font-semibold leading-none" data-testid="price">
          {annual ? annualPrice : monthlyPrice}
        </span>
        <span className="text-fg-soft">{annual ? perYear : perMonth}</span>
      </p>
      <p className="tnum mt-2 text-fg-soft">
        {annual ? yearlyNote : monthlyNote}
      </p>

      {mode === "checkout" ? (
        <form action="/api/stripe/checkout" method="post" className="mt-6" onSubmit={() => track("checkout_started", { interval })}>
          <input type="hidden" name="interval" value={interval} />
          <button type="submit" className="btn btn-cta w-full sm:w-auto" data-testid="checkout-button">
            {trial ? m.billing.trialButton.replace("{days}", String(TRIAL_DAYS)) : m.billing.subscribe}
          </button>
        </form>
      ) : (
        <Link href="/start" className="btn btn-cta mt-6 w-full sm:w-auto" onClick={() => track("cta_clicked", { place: "pricing" })}>
          {copy.cta}
        </Link>
      )}
      <p className="mt-4 max-w-md text-sm text-fg-soft">
        {mode === "landing"
          ? fill(copy.terms, {
              price: annual
                ? `${annualPrice} ${lang === "es" ? "al año" : "a year"}`
                : `${monthlyPrice} ${lang === "es" ? "al mes" : "a month"}`,
            })
            : trial
            ? m.billing.termsTrial
                .replace("{days}", String(TRIAL_DAYS))
                .replace("{price}", annual ? `${annualPrice} ${lang === "es" ? "al año" : "a year"}` : `${monthlyPrice} ${lang === "es" ? "al mes" : "a month"}`)
            : m.billing.termsPaid.replace("{price}", annual ? `${annualPrice} ${lang === "es" ? "al año" : "a year"}` : `${monthlyPrice} ${lang === "es" ? "al mes" : "a month"}`)}
      </p>
    </div>
  );
}
