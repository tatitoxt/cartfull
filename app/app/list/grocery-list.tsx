"use client";

import { useEffect, useMemo, useState } from "react";
import { keepForOffline } from "@/components/service-worker";
import { setItemState } from "@/lib/app/actions";
import { money, moneyExact } from "@/lib/format";
import type { Lang } from "@/lib/catalog/localize";
import { useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";

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
  lang,
}: {
  planId: string;
  budgetCents: number;
  lines: ListLine[];
  aisles: { aisle: string; label: string }[];
  editable: boolean;
  lang: Lang;
}) {
  const m = useMessages();
  const queueKey = `cartfull.list.${planId}.queue`;
  const [lines, setLines] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shareNote, setShareNote] = useState("");

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

  const share = async () => {
    const groups = aisles
      .map(({ aisle, label }) => {
        const items = toBuy.filter((l) => l.aisle === aisle);
        if (!items.length) return "";
        const rows = items.map((l) => `${l.checked ? "✓" : "□"} ${l.name} — ${l.buy}${l.checked ? ` (${m.list.shareChecked})` : ""}`);
        return `${label}\n${rows.join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");
    const text = `${m.list.shareTitle}\n${fill(m.list.shareTotal, { amount: moneyExact(total, lang) })}\n\n${groups}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: m.list.shareTitle, text });
        setShareNote(m.list.shared);
      } else {
        throw new Error("no share");
      }
    } catch {
      // AbortError covers a cancelled sheet and "no share targets"; copying works for both.
      try {
        await navigator.clipboard.writeText(text);
        setShareNote(m.list.shareCopied);
      } catch {
        setShareNote(m.list.shareError);
      }
    }
  };

  const over = total > budgetCents;
  const left = Math.abs(budgetCents - total);

  return (
    <div className="mt-4">
      <p className="tnum text-sm text-fg-soft" aria-live="polite">
        <span data-testid="in-cart-count">{inCart.length}</span>
        {fill(m.list.inCart, { checked: "", total: toBuy.length, amount: moneyExact(inCartCents, lang) })}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="btn btn-quiet" onClick={share} data-testid="share-list">
          {m.list.share}
        </button>
        {shareNote && (
          <span role="status" className="text-sm text-fg-soft">
            {shareNote}
          </span>
        )}
      </div>
      {(offline || failed) && (
        <p role="status" className="mt-4 rounded-2xl bg-spend-soft px-4 py-3 text-sm shadow-[inset_0_0_0_1.5px_var(--color-spend)]">
          {offline ? m.list.offline : m.list.unsynced}
        </p>
      )}

      <div className="mt-6 space-y-7">
        {aisles.map(({ aisle, label }) => {
          const group = toBuy.filter((l) => l.aisle === aisle);
          if (!group.length) return null;
          const subtotal = group.reduce((sum, l) => sum + l.cents, 0);
          return (
            <section key={aisle} aria-labelledby={`aisle-${aisle}`} data-testid="aisle">
              <h2 id={`aisle-${aisle}`} className="flex items-baseline justify-between gap-3 border-b border-fg pb-2 text-xl">
                {label}
                <span className="tnum font-sans text-sm font-semibold text-fg-soft">{moneyExact(subtotal, lang)}</span>
              </h2>
              <ul className="divide-y divide-line">
                {group.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 py-1.5" data-testid="list-item">
                    <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3">
                      <span className="relative size-6 shrink-0">
                        <input
                          type="checkbox"
                          checked={line.checked}
                          disabled={!editable}
                          onChange={(e) => change({ id: line.id, checked: e.target.checked })}
                          className="peer size-6 appearance-none rounded-full border-2 border-fg-faint bg-transparent transition-colors checked:border-accent checked:bg-accent disabled:opacity-50"
                        />
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-on-accent opacity-0 transition-opacity peer-checked:opacity-100"
                          aria-hidden="true"
                        >
                          <path d="M2 6.5 4.8 9.2 10 3" />
                        </svg>
                      </span>
                      <span className={`min-w-0 flex-1 ${line.checked ? "text-fg-faint line-through" : ""}`}>
                        <span className="block font-semibold leading-tight">{line.name}</span>
                        <span className="tnum block text-sm text-fg-soft">
                          {fill(m.list.needBuy, { need: line.need, buy: line.buy })}
                        </span>
                      </span>
                    </label>
                    <span className="tnum w-16 shrink-0 text-right font-semibold" data-testid="item-price">
                      {moneyExact(line.cents, lang)}
                    </span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => change({ id: line.id, have: true })}
                        className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-accent-deep shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:bg-bg-deep"
                        aria-label={fill(m.list.alreadyHave, { name: line.name })}
                        data-testid="have-button"
                      >
                        {m.list.haveButton}
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
            <h2 id="have-title" className="border-b border-line pb-2 text-xl text-fg-soft">
              {m.list.alreadyHome}
            </h2>
            <ul className="divide-y divide-line">
              {haveLines.map((line) => (
                <li key={line.id} className="flex min-h-14 items-center gap-3 py-2 text-fg-soft" data-testid="have-item">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-tight">{line.name}</span>
                    <span className="tnum block text-sm">{fill(m.list.need, { need: line.need })}</span>
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => change({ id: line.id, have: false })}
                      className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold underline underline-offset-4"
                      aria-label={fill(m.list.addBackLabel, { name: line.name, amount: moneyExact(line.cents, lang) })}
                    >
                      {fill(m.list.addBack, { amount: moneyExact(line.cents, lang) })}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-7 flex items-center justify-between gap-4 rounded-card bg-surface p-4 shadow-[inset_0_0_0_1.5px_var(--color-line)]">
        <p>
          <span className="block text-sm text-fg-soft">{m.budgetMeter.estimated}</span>
          <span className="tnum text-xl font-semibold" data-testid="cart-total">
            {money(total, lang)}
          </span>
        </p>
        <p className={`tnum shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${over ? "bg-over-soft text-over-deep" : "bg-accent-soft text-accent-deep"}`}>
          {over ? m.budgetMeter.over : m.budgetMeter.under} {money(left, lang)}
        </p>
      </div>
      <p className="mt-8 text-sm text-fg-faint">
        {m.list.prices}
      </p>
    </div>
  );
}
