import type { Metadata } from "next";
import Link from "next/link";
import { catalog } from "@/lib/catalog";
import { getPantry } from "@/lib/app/data";
import { loadAppState } from "@/lib/app/current";
import { pantryGroups } from "@/lib/app/pantry";
import { BUDGET_MAX_CENTS, BUDGET_MIN_CENTS, DEFAULTS, type Answers } from "@/lib/app/profile";
import { PRICING, TRIAL_DAYS } from "@/lib/billing/plans";
import { moneyExact } from "@/lib/format";
import { DISLIKE_OPTIONS } from "@/lib/planner/dislikes";
import { ThemePicker } from "@/components/theme-picker";
import { DeleteAccount } from "./delete-account";
import { SettingsForm } from "./settings-form";
import { MESSAGES } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await loadAppState("/app/account");
  return { title: MESSAGES[profile.lang].metadata.account };
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const { session, profile, entitlement } = await loadAppState("/app/account");
  const m = MESSAGES[profile.lang];
  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(profile.lang === "es" ? "es-ES" : "en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  const pantry = await getPantry(session);

  const answers: Answers = {
    weekly_budget_cents: Math.min(BUDGET_MAX_CENTS, Math.max(BUDGET_MIN_CENTS, profile.weekly_budget_cents ?? DEFAULTS.weekly_budget_cents)),
    usual_spend_cents: profile.usual_spend_cents,
    household_size: profile.household_size,
    diet: profile.diet,
    cook_time: profile.cook_time,
    include_breakfast: profile.include_breakfast,
    include_lunch: profile.include_lunch,
    allergens: profile.allergens,
    dislikes: profile.dislikes,
    pantry: [...pantry],
    country: profile.country,
    lang: profile.lang,
    units: profile.units,
    equipment: profile.equipment,
    notify_plan: profile.notify_plan,
    notify_shopping: profile.notify_shopping,
    notify_receipt: profile.notify_receipt,
  };

  const price = entitlement.interval === "annual"
    ? `${moneyExact(PRICING.annual.cents, profile.lang)} ${profile.lang === "es" ? "al año" : "a year"}`
    : `${moneyExact(PRICING.monthly.cents, profile.lang)} ${profile.lang === "es" ? "al mes" : "a month"}`;
  const billing = (() => {
    if (entitlement.status === "trialing")
      return entitlement.cancelAtPeriodEnd
        ? m.account.billing.trialEnds.replace("{date}", date(entitlement.trialEnd))
        : m.account.billing.trialThen.replace("{date}", date(entitlement.trialEnd)).replace("{price}", price);
    if (entitlement.status === "active")
      return entitlement.cancelAtPeriodEnd
        ? m.account.billing.canceled.replace("{date}", date(entitlement.periodEnd))
        : m.account.billing.renews.replace("{price}", price).replace("{date}", date(entitlement.periodEnd));
    if (entitlement.status === "past_due" || entitlement.status === "unpaid")
      return m.account.billing.pastDue;
    if (entitlement.hadSubscription) return m.account.billing.ended;
    return m.account.billing.freeWeek.replace("{days}", String(TRIAL_DAYS));
  })();

  return (
    <>
      <h1 className="text-4xl sm:text-5xl">{m.account.title}</h1>
      <p className="mt-2 text-fg-soft">{profile.email ?? session.email}</p>

      <section aria-labelledby="billing-title" className="mt-8 rounded-card bg-surface p-5 shadow-[inset_0_0_0_1.5px_var(--color-line)]">
        <h2 id="billing-title" className="text-2xl">
          {m.account.subscription}
        </h2>
        <p className="mt-2" data-testid="billing-status">
          {billing}
        </p>
        {params.error && (
          <p role="alert" className="mt-3 text-sm text-over-deep">
            {m.account.billingError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {!entitlement.active && (
            <Link href="/app/upgrade" className="btn btn-cta" data-testid="account-upgrade">
              {entitlement.hadSubscription ? m.account.seePlans : m.account.startTrial}
            </Link>
          )}
          {entitlement.hasCustomer && (
            <form action="/api/polar/portal" method="post">
              <button type="submit" className="btn btn-quiet" data-testid="portal-button">
                {m.account.manageBilling}
              </button>
            </form>
          )}
        </div>
        {entitlement.hasCustomer && (
          <p className="mt-3 text-sm text-fg-soft">{m.account.stripe}</p>
        )}
      </section>

      <SettingsForm
        initial={answers}
        pantry={pantryGroups(catalog.ingredients)}
        dislikeOptions={DISLIKE_OPTIONS.map(({ key }) => ({ key }))}
      />

      <ThemePicker />

      <section className="mt-10 border-t border-line pt-6" aria-labelledby="danger-title">
        <h2 id="danger-title" className="text-2xl">{m.account.deleteTitle}</h2>
        <div className="mt-4">
          <DeleteAccount />
        </div>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-quiet">
            {m.account.signOut}
          </button>
        </form>
        <p className="mt-6 text-sm text-fg-faint">
          {m.account.help}{" "}
          <a href="mailto:hello@cartfull.app" className="underline underline-offset-2">
            hello@cartfull.app
          </a>
          .
        </p>
      </section>
    </>
  );
}
