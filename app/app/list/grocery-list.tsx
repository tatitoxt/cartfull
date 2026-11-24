"use client";

import { useEffect, useMemo, useState } from "react";
import { keepForOffline } from "@/components/service-worker";
import { addExtraItem, getShareLink, removeExtraItem, setItemState } from "@/lib/app/actions";
import { money, moneyExact } from "@/lib/format";
import { amount, type Lang } from "@/lib/catalog/localize";
import { useLocale, useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/client";

export interface ListLine {
  id: string;
  name: string;
  aisle: string;
  need: string;
  buy: string;
  cents: number;
  /** Shelf cost in cents when nothing of the line is owned yet. */
  fullCents: number;
  qty: number;
  unit: string;
  /** Package sizing so offline totals match the server's package math. */
  pkgQty: number;
  pkgCents: number;
  byWeight: boolean;
  /** Units of `qty` already at home. */
  haveQty: number;
  have: boolean;
  checked: boolean;
  /** Hand-added item: no "have" tracking, removable. */
  extra: boolean;
}

export interface AddableItem {
  id: string;
  name: string;
  aisle: string;
  buy: string;
  cents: number;
}

type Change = { id: string; checked?: boolean; have?: boolean; haveQty?: number };

/**
 * The list keeps working in the store with no signal: changes apply on screen
 * at once, are kept in localStorage, and are sent when the connection returns.
 */
export function GroceryList({
  planId,
  budgetCents,
  lines: initial,
  addable,
  aisles,
  editable,
  lang,
}: {
  planId: string;
  budgetCents: number;
  lines: ListLine[];
  addable: AddableItem[];
  aisles: { aisle: string; label: string }[];
  editable: boolean;
  lang: Lang;
}) {
  const m = useMessages();
  const { units } = useLocale();
  const queueKey = `cartfull.list.${planId}.queue`;
  const [lines, setLines] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [extraQuery, setExtraQuery] = useState("");
  const [extraNote, setExtraNote] = useState("");

  const readQueue = (): Change[] => {
    try {
      return JSON.parse(localStorage.getItem(queueKey) ?? "[]") as Change[];
    } catch {
      return [];
    }
  };

  const apply = (list: ListLine[], change: Change) =>
    list.map((line) => {
      if (line.id !== change.id) return line;
      let { have, checked, haveQty } = line;
      if (typeof change.haveQty === "number") {
        haveQty = Math.max(0, Math.min(change.haveQty, line.qty));
        have = haveQty >= line.qty - 1e-6;
        if (have) checked = false;
      } else if (typeof change.have === "boolean") {
        have = change.have;
        haveQty = have ? line.qty : 0;
        if (have) checked = false;
      }
      if (typeof change.checked === "boolean") checked = change.checked;
      const buyQty = have ? 0 : Math.max(0, line.qty - haveQty);
      const pkgs =
        buyQty <= 0
          ? 0
          : line.byWeight
            ? Math.ceil((buyQty / line.pkgQty) * 4 - 1e-6) / 4
            : Math.ceil(buyQty / line.pkgQty - 1e-6);
      return { ...line, have, checked, haveQty, cents: Math.round(pkgs * line.pkgCents) };
    });

  const flush = async () => {
    let queue = readQueue();
    const sending = queue.length > 0;
    while (queue.length) {
      const [change] = queue;
      try {
        const result = await setItemState(planId, change.id, { checked: change.checked, have: change.have, haveQty: change.haveQty });
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

  // Ticks from a shared-list shopper arrive live; local queued changes win.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`grocery-list-${planId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plan_items", filter: `plan_id=eq.${planId}` },
        (payload) => {
          const row = payload.new as { ingredient_id?: string; checked?: boolean };
          if (typeof row?.ingredient_id !== "string") return;
          if (readQueue().some((change) => change.id === row.ingredient_id)) return;
          setLines((list) => list.map((l) => (l.id === row.ingredient_id ? { ...l, checked: row.checked === true } : l)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const change = (next: Change) => {
    setLines((list) => apply(list, next));
    localStorage.setItem(queueKey, JSON.stringify([...readQueue(), next]));
    if (navigator.onLine) void flush();
  };

  const addExtra = async (item: AddableItem) => {
    setExtraQuery("");
    setExtraNote(m.list.extraAdded);
    setLines((list) => [
      ...list,
      {
        id: item.id, name: item.name, aisle: item.aisle, need: "", buy: item.buy,
        cents: item.cents, fullCents: item.cents, qty: 1, unit: "each",
        pkgQty: 1, pkgCents: item.cents, byWeight: false, haveQty: 0,
        have: false, checked: false, extra: true,
      },
    ]);
    const result = await addExtraItem(planId, item.id);
    if (!result.ok) setExtraNote(m.list.extraError);
  };

  const removeExtra = async (id: string) => {
    setLines((list) => list.filter((l) => l.id !== id));
    const result = await removeExtraItem(planId, id);
    if (!result.ok) setExtraNote(m.list.extraError);
  };

  const onList = useMemo(() => new Set(lines.map((l) => l.id)), [lines]);
  const matches = useMemo(() => {
    const q = extraQuery.trim().toLowerCase();
    if (!q) return [];
    return addable.filter((i) => !onList.has(i.id) && i.name.toLowerCase().includes(q)).slice(0, 8);
  }, [extraQuery, addable, onList]);

  const total = useMemo(() => lines.reduce((sum, l) => sum + (l.have ? 0 : l.cents), 0), [lines]);
  const toBuy = lines.filter((l) => !l.have);
  const inCart = toBuy.filter((l) => l.checked);
  const inCartCents = inCart.reduce((sum, l) => sum + l.cents, 0);
  const haveLines = lines.filter((l) => l.have);

  const shareLive = async () => {
    const url = await getShareLink(planId);
    if (!url) {
      setShareNote(m.list.shareLiveError);
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: m.list.shareTitle, text: `${m.list.shareTitle}: ${url}` });
        setShareNote(m.list.shared);
      } else {
        throw new Error("no share");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareNote(m.list.shareLiveNote);
      } catch {
        setShareNote(m.list.shareError);
      }
    }
  };

  const share = async () => {
    const groups = aisles
      .map(({ aisle, label }) => {
        const items = toBuy.filter((l) => l.aisle === aisle);
        if (!items.length) return "";
        const rows = items.map(
          (l) =>
            `${l.checked ? "✓" : "□"} ${l.name} — ${l.buy}${l.haveQty > 0 ? ` (${fill(m.list.haveSome, { qty: amount(l.haveQty, l.unit, lang, units) })})` : ""}${l.checked ? ` (${m.list.shareChecked})` : ""}`,
        );
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
        {editable && (
          <button type="button" className="btn btn-quiet" onClick={shareLive} data-testid="share-live">
            {m.list.shareLive}
          </button>
        )}
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
                <span className="tnum font-sans text-sm font-semibold text-budget">{moneyExact(subtotal, lang)}</span>
              </h2>
              <ul className="mt-2 space-y-2">
                {group.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 shadow-[inset_0_0_0_1.5px_var(--color-line)]"
                    data-testid="list-item"
                  >
                    <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
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
                      <span className={`min-w-0 flex-1 ${line.checked ? "text-fg-soft line-through decoration-accent decoration-2" : ""}`}>
                        <span className="block font-semibold leading-tight">{line.name}</span>
                        <span className="tnum block text-sm text-fg-soft">
                          {line.extra ? line.buy : fill(m.list.needBuy, { need: line.need, buy: line.buy })}
                          {line.haveQty > 0 && (
                            <span className="text-accent-deep"> · {fill(m.list.haveSome, { qty: amount(line.haveQty, line.unit, lang, units) })}</span>
                          )}
                        </span>
                        <span className="tnum mt-0.5 block w-fit text-sm font-semibold text-spend" data-testid="item-price">
                          {moneyExact(line.cents, lang)}
                        </span>
                      </span>
                    </label>
                    {editable && line.extra && (
                      <button
                        type="button"
                        onClick={() => void removeExtra(line.id)}
                        aria-label={fill(m.list.extraRemove, { name: line.name })}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-faint shadow-[inset_0_0_0_1.5px_var(--color-line)] transition-colors hover:text-over-deep"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M1 1l10 10M11 1L1 11" />
                        </svg>
                      </button>
                    )}
                    {editable && !line.extra && (
                      <span className="flex shrink-0 items-center gap-1">
                        {line.haveQty > 0 && (
                          <button
                            type="button"
                            onClick={() => change({ id: line.id, haveQty: line.haveQty - 1 })}
                            className="flex size-8 items-center justify-center rounded-full text-base font-bold text-fg-soft shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:text-fg"
                            aria-label={fill(m.list.haveLess, { name: line.name })}
                          >
                            −
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => change({ id: line.id, haveQty: line.haveQty + (line.qty > 1 ? 1 : Math.min(0.5, line.qty)) })}
                          className="flex size-8 items-center justify-center rounded-full text-base font-bold text-accent-deep shadow-[inset_0_0_0_1.5px_var(--color-accent)] hover:bg-bg-deep"
                          aria-label={fill(m.list.haveAdd, { name: line.name })}
                          data-testid="have-button"
                        >
                          +
                        </button>
                      </span>
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
            <ul className="mt-2 space-y-2">
              {haveLines.map((line) => (
                <li
                  key={line.id}
                  className="flex min-h-11 items-center gap-3 rounded-2xl bg-surface px-3 py-2 text-fg-soft shadow-[inset_0_0_0_1.5px_var(--color-line)]"
                  data-testid="have-item"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-tight">{line.name}</span>
                    <span className="tnum block text-sm">{fill(m.list.need, { need: line.need })}</span>
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => change({ id: line.id, haveQty: 0 })}
                      className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold underline underline-offset-4"
                      aria-label={fill(m.list.addBackLabel, { name: line.name, amount: moneyExact(line.fullCents, lang) })}
                    >
                      {fill(m.list.addBack, { amount: moneyExact(line.fullCents, lang) })}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {editable && (
        <section className="mt-7" aria-labelledby="extras-title">
          <h2 id="extras-title" className="text-xl">
            {m.list.extraAdd}
          </h2>
          <input
            type="search"
            value={extraQuery}
            onChange={(e) => setExtraQuery(e.target.value)}
            placeholder={m.list.extraPlaceholder}
            className="mt-3 w-full rounded-2xl bg-surface px-4 py-3 shadow-[inset_0_0_0_1.5px_var(--color-line)] placeholder:text-fg-faint focus:outline focus:outline-2 focus:outline-accent"
            aria-label={m.list.extraAdd}
          />
          {extraQuery.trim() !== "" && (
            <ul className="mt-2 space-y-2">
              {matches.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void addExtra(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left shadow-[inset_0_0_0_1.5px_var(--color-line)] transition-colors hover:bg-bg-deep"
                  >
                    <span>
                      <span className="block font-semibold leading-tight">{item.name}</span>
                      <span className="tnum block text-sm text-fg-soft">{item.buy}</span>
                    </span>
                    <span className="tnum text-sm font-semibold text-spend">{moneyExact(item.cents, lang)}</span>
                  </button>
                </li>
              ))}
              {!matches.length && (
                <li className="px-1 py-2 text-sm text-fg-soft">{m.list.extraEmpty}</li>
              )}
            </ul>
          )}
          {extraNote && (
            <p role="status" className="mt-2 text-sm text-fg-soft">{extraNote}</p>
          )}
        </section>
      )}

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
