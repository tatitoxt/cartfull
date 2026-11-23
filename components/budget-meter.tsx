"use client";

import { money, moneyRound } from "@/lib/format";
import { useLocale, useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";

/** Cart total against the weekly budget. Lime marks money kept; red warns when over. */
export function BudgetMeter({ totalCents, budgetCents }: { totalCents: number; budgetCents: number }) {
  const { lang } = useLocale();
  const m = useMessages();
  const over = totalCents > budgetCents;
  const left = Math.abs(budgetCents - totalCents);
  const percent = Math.min(100, (totalCents / budgetCents) * 100);
  return (
    <div data-testid="budget-meter">
      <div className="flex items-end justify-between gap-4">
        <p>
          <span className="block text-sm font-medium text-fg-soft">{m.budgetMeter.estimated}</span>
          <span className="tnum font-display text-5xl font-semibold leading-none" data-testid="cart-total">
            {money(totalCents, lang)}
          </span>
        </p>
        <p className="text-right">
          <span className="block text-sm font-medium text-fg-soft">{over ? m.budgetMeter.over : m.budgetMeter.under}</span>
          <span
            className={`tnum font-display text-3xl font-semibold leading-none ${over ? "text-over-deep" : "text-accent-deep"}`}
            data-testid="budget-left"
          >
            {money(left, lang)}
          </span>
        </p>
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label={m.budgetMeter.aria}
        aria-valuemin={0}
        aria-valuemax={budgetCents / 100}
        aria-valuenow={Math.round(totalCents) / 100}
        aria-valuetext={fill(m.budgetMeter.meterValue, {
          total: money(totalCents, lang),
          budget: moneyRound(budgetCents, lang),
        })}
      >
        <div className={`h-full rounded-full ${over ? "bg-over" : "bg-accent"}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="tnum mt-2 text-sm text-fg-soft">
        {m.budgetMeter.weeklyPrefix}
        <span className="font-semibold text-budget" data-testid="budget">{moneyRound(budgetCents, lang)}</span>
        {m.budgetMeter.weeklySuffix}
      </p>
    </div>
  );
}
