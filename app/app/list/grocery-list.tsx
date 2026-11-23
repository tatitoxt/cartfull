"use client";

import { useEffect, useMemo, useState } from "react";
import { BudgetMeter } from "@/components/budget-meter";
import { keepForOffline } from "@/components/service-worker";
import { setItemState } from "@/lib/app/actions";
import { moneyExact } from "@/lib/format";

export interface ListLine {
  id: string;
  name: string;
  aisle: string;
  need: string;
  buy: string;
  cents: number;
  have: boolean;
  checked: boolean;
}

type Change = { id: string; checked?: boolean; have?: boolean };

/**
 * The list keeps working in the store with no signal: changes apply on screen
 * at once, are kept in localStorage, and are sent when the connection returns.
 */
export function GroceryList({
  planId,
  budgetCents,
  lines: initial,
  aisles,
  editable,
}: {
  planId: string;
  budgetCents: number;
  lines: ListLine[];
  aisles: { aisle: string; label: string }[];
  editable: boolean;
}) {
  const queueKey = `cartfull.list.${planId}.queue`;
  const [lines, setLines] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [failed, setFailed] = useState(false);

  const readQueue = (): Change[] => {
    try {
      return JSON.parse(localStorage.getItem(queueKey) ?? "[]") as Change[];
    } catch {
      return [];
    }
  };

  const apply = (list: ListLine[], change: Change) =>
    list.map((line) =>
      line.id === change.id
        ? {
            ...line,
            have: change.have ?? line.have,
            checked: change.have ? false : (change.checked ?? line.checked),
          }
        : line,
    );

  const flush = async () => {
    let queue = readQueue();
    const sending = queue.length > 0;
    while (queue.length) {
      const [change] = queue;
      try {
        const result = await setItemState(planId, change.id, { checked: change.checked, have: change.have });
        if (!result.ok && result.code === "failed") throw new Error(result.message);
      } catch {
        setFailed(true);
        return;
      }
      queue = readQueue().slice(1);
      localStorage.setItem(queueKey, JSON.stringify(queue));
    }
    setFailed(false);
    if (sending) keepForOffline();
  };

  useEffect(() => {
    // Replay anything that was changed while offline on top of the server's copy.
    setLines(readQueue().reduce(apply, initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) void flush();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (next: Change) => {
    setLines((list) => apply(list, next));
    localStorage.setItem(queueKey, JSON.stringify([...readQueue(), next]));
    if (navigator.onLine) void flush();
  };

  const total = useMemo(() => lines.reduce((sum, l) => sum + (l.have ? 0 : l.cents), 0), [lines]);
  const toBuy = lines.filter((l) => !l.have);
  const inCart = toBuy.filter((l) => l.checked);
  const inCartCents = inCart.reduce((sum, l) => sum + l.cents, 0);
  const haveLines = lines.filter((l) => l.have);

  return (
    <div className="mt-7">
      <BudgetMeter totalCents={total} budgetCents={budgetCents} />
      <p className="tnum mt-3 text-sm text-ink-soft" aria-live="polite">
        <span data-testid="in-cart-count">{inCart.length}</span> of {toBuy.length} items in your cart ·{" "}
        {moneyExact(inCartCents)} so far
      </p>
      {(offline || failed) && (
        <p role="status" className="mt-4 rounded-2xl bg-yellow-soft px-4 py-3 text-sm shadow-[inset_0_0_0_1.5px_var(--color-yellow)]">
          {offline ? "You're offline. Keep checking things off; changes sync when you're back." : "Some changes haven't synced yet. We'll keep trying."}
        </p>
      )}

      <div className="mt-8 space-y-9">
        {aisles.map(({ aisle, label }) => {
          const group = toBuy.filter((l) => l.aisle === aisle);
          if (!group.length) return null;
          const subtotal = group.reduce((sum, l) => sum + l.cents, 0);
          return (
            <section key={aisle} aria-labelledby={`aisle-${aisle}`} data-testid="aisle">
              <h2 id={`aisle-${aisle}`} className="flex items-baseline justify-between gap-3 border-b border-ink pb-2 text-xl">
                {label}
                <span className="tnum font-sans text-sm font-semibold text-ink-soft">{moneyExact(subtotal)}</span>
              </h2>
              <ul className="divide-y divide-line">
                {group.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 py-2" data-testid="list-item">
                    <label className="flex min-h-14 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={line.checked}
                        disabled={!editable}
                        onChange={(e) => change({ id: line.id, checked: e.target.checked })}
                        className="size-6 shrink-0 rounded-md accent-[var(--color-green)]"
                      />
                      <span className={`min-w-0 flex-1 ${line.checked ? "text-ink-faint line-through" : ""}`}>
                        <span className="block font-semibold leading-tight">{line.name}</span>
                        <span className="tnum block text-sm text-ink-soft">
                          Need {line.need} · buy {line.buy}
                        </span>
                      </span>
                    </label>
                    <span className="tnum w-16 shrink-0 text-right font-semibold" data-testid="item-price">
                      {moneyExact(line.cents)}
                    </span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => change({ id: line.id, have: true })}
                        className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-green-deep shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:bg-paper-deep"
                        aria-label={`I already have ${line.name}`}
                        data-testid="have-button"
                      >
                        Have it
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {haveLines.length > 0 && (
          <section aria-labelledby="have-title">
            <h2 id="have-title" className="border-b border-line pb-2 text-xl text-ink-soft">
              Already at home
            </h2>
            <ul className="divide-y divide-line">
              {haveLines.map((line) => (
                <li key={line.id} className="flex min-h-14 items-center gap-3 py-2 text-ink-soft" data-testid="have-item">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-tight">{line.name}</span>
                    <span className="tnum block text-sm">Need {line.need}</span>
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => change({ id: line.id, have: false })}
                      className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold underline underline-offset-4"
                      aria-label={`Add ${line.name} back to the list, ${moneyExact(line.cents)}`}
                    >
                      Add back · {moneyExact(line.cents)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <p className="mt-10 text-sm text-ink-faint">
        Prices are estimates for whole packages at a typical US discount grocer. Your receipt will differ.
      </p>
    </div>
  );
}
