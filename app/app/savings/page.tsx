import type { Metadata } from "next";
import Link from "next/link";
import { loadAppState } from "@/lib/app/current";
import { summarizeSavings } from "@/lib/app/savings";
import { weekLabel } from "@/lib/app/week";
import { money, moneyRound } from "@/lib/format";
import { ShareSavings } from "./share-savings";
import { SpendForm } from "./spend-form";
import { MESSAGES, fill } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await loadAppState("/app/savings");
  return { title: MESSAGES[profile.lang].metadata.savings };
}

export default async function SavingsPage() {
  const { plans, entitlement, firstId, profile } = await loadAppState("/app/savings");
  const lang = profile.lang;
  const m = MESSAGES[lang];
  const visible = entitlement.active ? plans : plans.filter((p) => p.id === firstId);
  const summary = summarizeSavings(visible);

  if (!summary.weeks.length) {
    return (
      <section className="py-10">
        <h1 className="text-4xl">{m.savings.title}</h1>
        <p className="mt-3 text-fg-soft">{m.savings.first}</p>
        <Link href="/app/plan" className="btn btn-primary mt-6">
          {m.common.goPlan}
        </Link>
      </section>
    );
  }

  const saved = summary.totalSavedCents;
  const anyEstimate = summary.weeks.some((w) => w.usualIsEstimate);
  const peak = Math.max(...summary.weeks.map((w) => Math.max(w.usualCents, w.spentCents)));

  return (
    <>
      <section aria-labelledby="saved-title" className="glass rounded-card bg-accent-soft p-4">
        <h1 id="saved-title" className="text-sm font-semibold uppercase tracking-wider text-accent-deep">
          {saved >= 0 ? m.savings.saved : m.savings.over}
        </h1>
        <p className="tnum mt-1.5 font-display text-5xl font-semibold leading-none" data-testid="total-saved">
          {moneyRound(Math.abs(saved), lang)}
        </p>
        <p className="tnum mt-3 text-fg-soft">
          {fill(m.savings.across, { count: summary.weeks.length, unit: summary.weeks.length === 1 ? m.savings.week : m.savings.weeks })}
          {summary.weeks.length > 1 && saved > 0 && <> {fill(m.savings.average, { amount: moneyRound(summary.averageSavedCents, lang) })}</>}
        </p>
        {saved > 0 && (
          <p className="tnum mt-4 max-w-sm text-sm text-fg-soft">
            {fill(m.savings.pace, { amount: moneyRound(summary.yearlyPaceCents, lang) })}
          </p>
        )}
        {saved > 0 && <ShareSavings savedCents={saved} weeks={summary.weeks.length} />}
      </section>

      {summary.confirmedWeeks < summary.weeks.length && (
        <p className="mt-4 text-sm text-fg-soft">
          {m.savings.missingReceipt}
        </p>
      )}

      <h2 className="mt-10 text-2xl">{m.savings.weekByWeek}</h2>
      <ol className="mt-4 space-y-4">
        {summary.weeks.map((week) => (
          <li key={week.id} className="rounded-card bg-surface p-4 shadow-[inset_0_0_0_1.5px_var(--color-line)]" data-testid="savings-week">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-xl">{fill(m.common.weekOf, { date: weekLabel(week.weekStart, lang) })}</h3>
              <p className={`tnum shrink-0 font-semibold ${week.savedCents >= 0 ? "text-accent-deep" : "text-over-deep"}`} data-testid="week-saved">
                {week.savedCents >= 0
                  ? fill(m.savings.savedAmount, { amount: money(week.savedCents, lang) })
                  : fill(m.savings.overUsual, { amount: money(-week.savedCents, lang) })}
              </p>
            </div>
            <dl className="tnum mt-4 space-y-2 text-sm">
              {[
                { label: week.usualIsEstimate ? m.savings.typical : m.savings.yourUsual, cents: week.usualCents, bar: "bg-spend" },
                { label: week.spentIsActual ? m.savings.spent : m.savings.budget, cents: week.spentCents, bar: "bg-accent" },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3">
                  <dt className="text-fg-soft">{row.label}</dt>
                  <dd className="contents">
                    <span className="h-2.5 rounded-full bg-bg-deep" aria-hidden="true">
                      <span className={`block h-full rounded-full ${row.bar}`} style={{ width: `${(row.cents / peak) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold">{money(row.cents, lang)}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <SpendForm planId={week.id} spentCents={week.spentIsActual ? week.spentCents : null} />
          </li>
        ))}
      </ol>

      {!entitlement.active && plans.length > visible.length && (
        <p className="mt-6 text-fg-soft">
          {fill(m.savings.earlier, { count: plans.length - visible.length })}{" "}
          <Link href="/app/upgrade" className="font-semibold text-accent-deep underline underline-offset-4">
            {m.savings.subscribe}
          </Link>
          .
        </p>
      )}
      {anyEstimate && (
        <p className="mt-6 text-sm text-fg-faint">
          {m.savings.estimate}{" "}
          <Link href="/app/account" className="underline underline-offset-2">
            {m.savings.enterUsual}
          </Link>{" "}
          {m.savings.truer}
        </p>
      )}
    </>
  );
}
