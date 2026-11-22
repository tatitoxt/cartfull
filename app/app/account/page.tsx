import type { Metadata } from "next";
import Link from "next/link";
import { catalog } from "@/lib/catalog";
import { getPantry } from "@/lib/app/data";
import { loadAppState } from "@/lib/app/current";
import { pantryGroups } from "@/lib/app/pantry";
import { BUDGET_MAX_CENTS, BUDGET_MIN_CENTS, DEFAULTS, type Answers } from "@/lib/app/profile";
import { PRICING, TRIAL_DAYS } from "@/lib/billing/plans";
import { DISLIKE_OPTIONS } from "@/lib/planner/dislikes";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Account" };

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const { session, profile, entitlement } = await loadAppState("/app/account");
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
  };

  const price = entitlement.interval === "annual" ? `${PRICING.annual.label} a year` : `${PRICING.monthly.label} a month`;
  const billing = (() => {
    if (entitlement.status === "trialing")
      return entitlement.cancelAtPeriodEnd
        ? `Free trial, ends ${date(entitlement.trialEnd)}. You won't be charged.`
        : `Free trial until ${date(entitlement.trialEnd)}, then ${price}.`;
    if (entitlement.status === "active")
      return entitlement.cancelAtPeriodEnd
        ? `Canceled. You keep access until ${date(entitlement.periodEnd)}.`
        : `${price}. Renews ${date(entitlement.periodEnd)}.`;
    if (entitlement.status === "past_due" || entitlement.status === "unpaid")
      return "Your last payment didn't go through. Update your card to keep planning.";
    if (entitlement.hadSubscription) return "Your subscription has ended.";
    return `You're on the free first week. Try everything free for ${TRIAL_DAYS} days.`;
  })();

  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Account</h1>
      <p className="mt-2 text-ink-soft">{profile.email ?? session.email}</p>

      <section aria-labelledby="billing-title" className="mt-8 rounded-card bg-surface p-5 shadow-[inset_0_0_0_1.5px_var(--color-line)]">
        <h2 id="billing-title" className="text-2xl">
          Subscription
        </h2>
        <p className="mt-2" data-testid="billing-status">
          {billing}
        </p>
        {params.error && (
          <p role="alert" className="mt-3 text-sm text-tomato-deep">
            We couldn&apos;t open the billing page. Try again in a moment.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {!entitlement.active && (
            <Link href="/app/upgrade" className="btn btn-cta" data-testid="account-upgrade">
              {entitlement.hadSubscription ? "See plans" : "Start my free trial"}
            </Link>
          )}
          {entitlement.hasCustomer && (
            <form action="/api/stripe/portal" method="post">
              <button type="submit" className="btn btn-quiet" data-testid="portal-button">
                Manage billing
              </button>
            </form>
          )}
        </div>
        {entitlement.hasCustomer && (
          <p className="mt-3 text-sm text-ink-soft">Change your card, switch plans, download invoices or cancel. Opens Stripe.</p>
        )}
      </section>

      <SettingsForm
        initial={answers}
        pantry={pantryGroups(catalog.ingredients)}
        dislikeOptions={DISLIKE_OPTIONS.map(({ key, label }) => ({ key, label }))}
      />

      <section className="mt-10 border-t border-line pt-6">
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-quiet">
            Sign out
          </button>
        </form>
        <p className="mt-6 text-sm text-ink-faint">
          Need help or want your data deleted? Email{" "}
          <a href="mailto:hello@cartfull.app" className="underline underline-offset-2">
            hello@cartfull.app
          </a>
          .
        </p>
      </section>
    </>
  );
}
