"use client";

import { useLocale, useMessages } from "@/lib/i18n/locale-provider";
import { money } from "@/lib/format";
import { fill } from "@/lib/i18n/messages";

export function BudgetMeter({
  budgetCents,
  totalCents,
  highlight,
}: {
  budgetCents: number;
  totalCents: number;
  /** Emphasis label for under/over budget. */
  highlight?: string;
}) {
  const m = useMessages();
  const { lang } = useLocale();
  const over = totalCents > budgetCents;
  const left = Math.abs(budgetCents - totalCents);
  const pct = Math.min(100, Math.round((totalCents / budgetCents) * 100));
  return (
    <div className="glass rounded-card p-4">
      <div className="flex items-end justify-between gap-3">
        <p>
          <span className="block text-xs uppercase tracking-wide text-fg-soft">{m.budgetMeter.estimated}</span>
          <span className="tnum mt-0.5 block text-3xl font-semibold leading-none" data-testid="cart-total">
            {money(totalCents, lang)}
          </span>
        </p>
        <p className="text-right">
          <span className="tnum block text-xl font-semibold text-budget" data-testid="budget">
            {money(budgetCents, lang)}
          </span>
          <span className="block text-xs text-fg-soft" data-testid="budget-left">
            {over ? m.budgetMeter.over : m.budgetMeter.under} {money(left, lang)}
            {highlight ? ` · ${highlight}` : ""}
          </span>
        </p>
      </div>
      <div
        role="meter"
        aria-valuenow={totalCents}
        aria-valuemin={0}
        aria-valuemax={budgetCents}
        aria-label={fill(m.budgetMeter.meterValue, { total: money(totalCents, lang), budget: money(budgetCents, lang) })}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg-faint/30"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, pct)}%`, background: over ? "var(--color-warn)" : "var(--color-accent)" }}
        />
      </div>
    </div>
  );
}
