import type { Metadata } from "next";
import Link from "next/link";
import { loadAppState } from "@/lib/app/current";
import { summarizeSavings } from "@/lib/app/savings";
import { weekLabel } from "@/lib/app/week";
import { money, moneyRound } from "@/lib/format";
import { ShareSavings } from "./share-savings";
import { SpendForm } from "./spend-form";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsPage() {
  const { plans, entitlement, firstId } = await loadAppState("/app/savings");
  const visible = entitlement.active ? plans : plans.filter((p) => p.id === firstId);
  const summary = summarizeSavings(visible);

  if (!summary.weeks.length) {
    return (
      <section className="py-10">
        <h1 className="text-4xl">Savings</h1>
        <p className="mt-3 text-ink-soft">Plan your first week and we&apos;ll start counting what you keep.</p>
        <Link href="/app/plan" className="btn btn-primary mt-6">
          Go to my plan
        </Link>
      </section>
    );
  }

  const saved = summary.totalSavedCents;
  const anyEstimate = summary.weeks.some((w) => w.usualIsEstimate);
  const peak = Math.max(...summary.weeks.map((w) => Math.max(w.usualCents, w.spentCents)));

  return (
    <>
      <section aria-labelledby="saved-title" className="rounded-card bg-green-deep p-6 text-paper sm:p-8">
        <h1 id="saved-title" className="text-sm font-semibold uppercase tracking-wider text-mint">
          {saved >= 0 ? "Saved so far" : "Over your usual so far"}
        </h1>
        <p className="tnum mt-2 font-display text-7xl font-semibold leading-none" data-testid="total-saved">
          {moneyRound(Math.abs(saved))}
        </p>
        <p className="tnum mt-3 text-mint">
          across {summary.weeks.length} {summary.weeks.length === 1 ? "week" : "weeks"}
          {summary.weeks.length > 1 && saved > 0 && <> · about {moneyRound(summary.averageSavedCents)} a week</>}
        </p>
        {saved > 0 && (
          <p className="tnum mt-5 max-w-sm text-paper/85">
            At this pace that&apos;s <strong className="text-yellow">{moneyRound(summary.yearlyPaceCents)}</strong> a year back in
            your pocket.
          </p>
        )}
        {saved > 0 && <ShareSavings savedCents={saved} weeks={summary.weeks.length} />}
      </section>

      {summary.confirmedWeeks < summary.weeks.length && (
        <p className="mt-4 text-sm text-ink-soft">
          Weeks without a receipt count as if you spent your whole budget. Add what you really spent to make the number yours.
        </p>
      )}

      <h2 className="mt-10 text-2xl">Week by week</h2>
      <ol className="mt-4 space-y-4">
        {summary.weeks.map((week) => (
          <li key={week.id} className="rounded-card bg-surface p-5 shadow-[inset_0_0_0_1.5px_var(--color-line)]" data-testid="savings-week">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-xl">Week of {weekLabel(week.weekStart)}</h3>
              <p className={`tnum shrink-0 font-semibold ${week.savedCents >= 0 ? "text-tomato-deep" : "text-ink"}`} data-testid="week-saved">
                {week.savedCents >= 0 ? `Saved ${money(week.savedCents)}` : `${money(-week.savedCents)} over usual`}
              </p>
            </div>
            <dl className="tnum mt-4 space-y-2 text-sm">
              {[
                { label: week.usualIsEstimate ? "Typical week" : "Your usual", cents: week.usualCents, bar: "bg-line" },
                { label: week.spentIsActual ? "You spent" : "Your budget", cents: week.spentCents, bar: "bg-green" },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3">
                  <dt className="text-ink-soft">{row.label}</dt>
                  <dd className="contents">
                    <span className="h-2.5 rounded-full bg-paper-deep" aria-hidden="true">
                      <span className={`block h-full rounded-full ${row.bar}`} style={{ width: `${(row.cents / peak) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold">{money(row.cents)}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <SpendForm planId={week.id} spentCents={week.spentIsActual ? week.spentCents : null} />
          </li>
        ))}
      </ol>

      {!entitlement.active && plans.length > visible.length && (
        <p className="mt-6 text-ink-soft">
          {plans.length - visible.length} earlier weeks are saved.{" "}
          <Link href="/app/upgrade" className="font-semibold text-green-deep underline underline-offset-4">
            Subscribe to see them
          </Link>
          .
        </p>
      )}
      {anyEstimate && (
        <p className="mt-6 text-sm text-ink-faint">
          &ldquo;Typical week&rdquo; is a rough figure for a household your size.{" "}
          <Link href="/app/account" className="underline underline-offset-2">
            Enter what you usually spend
          </Link>{" "}
          for a truer comparison.
        </p>
      )}
    </>
  );
}
