import { money, moneyRound } from "@/lib/format";

/** Cart total against the weekly budget. Tomato marks money kept; yellow warns when over. */
export function BudgetMeter({ totalCents, budgetCents }: { totalCents: number; budgetCents: number }) {
  const over = totalCents > budgetCents;
  const left = Math.abs(budgetCents - totalCents);
  const fill = Math.min(100, (totalCents / budgetCents) * 100);
  return (
    <div data-testid="budget-meter">
      <div className="flex items-end justify-between gap-4">
        <p>
          <span className="block text-sm font-medium text-ink-soft">Estimated cart</span>
          <span className="tnum font-display text-5xl font-semibold leading-none" data-testid="cart-total">
            {money(totalCents)}
          </span>
        </p>
        <p className="text-right">
          <span className="block text-sm font-medium text-ink-soft">{over ? "Over budget" : "Under budget"}</span>
          <span
            className={`tnum font-display text-3xl font-semibold leading-none ${over ? "text-ink" : "text-tomato-deep"}`}
            data-testid="budget-left"
          >
            {money(left)}
          </span>
        </p>
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label="Cart total against budget"
        aria-valuemin={0}
        aria-valuemax={budgetCents / 100}
        aria-valuenow={Math.round(totalCents) / 100}
        aria-valuetext={`${money(totalCents)} of ${moneyRound(budgetCents)}`}
      >
        <div className={`h-full rounded-full ${over ? "bg-yellow" : "bg-green"}`} style={{ width: `${fill}%` }} />
      </div>
      <p className="tnum mt-2 text-sm text-ink-soft">
        of your <span data-testid="budget">{moneyRound(budgetCents)}</span> weekly budget
      </p>
    </div>
  );
}
