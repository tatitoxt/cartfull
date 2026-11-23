"use client";

import { useEffect, useState } from "react";
import { checkSharedItem } from "@/lib/app/actions";
import { useMessages } from "@/lib/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";

export interface SharedLine {
  id: string;
  name: string;
  aisle: string;
  need: string;
  buy: string;
  checked: boolean;
  have: boolean;
}

/** The shopper's view: tap an item to tick it off; ticks sync live for everyone. */
export function SharedList({
  token,
  planId,
  lines: initial,
  aisles,
}: {
  token: string;
  planId: string;
  lines: SharedLine[];
  aisles: { aisle: string; label: string }[];
}) {
  const m = useMessages();
  const [lines, setLines] = useState(initial);
  const [note, setNote] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`shared-list-${planId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plan_items", filter: `plan_id=eq.${planId}` },
        (payload) => {
          const row = payload.new as { ingredient_id?: string; checked?: boolean };
          if (typeof row?.ingredient_id !== "string") return;
          setLines((list) => list.map((l) => (l.id === row.ingredient_id ? { ...l, checked: row.checked === true } : l)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [planId]);

  const toggle = async (id: string) => {
    const line = lines.find((l) => l.id === id);
    if (!line || line.have) return;
    const next = !line.checked;
    setLines((list) => list.map((l) => (l.id === id ? { ...l, checked: next } : l)));
    const ok = await checkSharedItem(token, id, next);
    if (!ok) {
      setLines((list) => list.map((l) => (l.id === id ? { ...l, checked: !next } : l)));
      setNote(m.shared.saveError);
    }
  };

  const toBuy = lines.filter((l) => !l.have);
  const done = toBuy.filter((l) => l.checked).length;

  return (
    <div className="mt-6">
      <p className="tnum text-sm text-fg-soft" aria-live="polite">
        {done} / {toBuy.length} {m.shared.ticked}
      </p>
      {note ? <p className="mt-2 text-sm text-over">{note}</p> : null}
      {aisles.map(({ aisle, label }) => {
        const group = toBuy.filter((l) => l.aisle === aisle);
        if (!group.length) return null;
        return (
          <section key={aisle} aria-labelledby={`shared-${aisle}`}>
            <h2 id={`shared-${aisle}`} className="mt-6 border-b border-fg pb-2 text-xl">
              {label}
            </h2>
            <ul className="mt-3 space-y-2">
              {group.map((line) => (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => void toggle(line.id)}
                    aria-pressed={line.checked}
                    className="flex w-full items-start gap-3 rounded-card bg-surface p-4 text-left shadow-[inset_0_0_0_1.5px_var(--color-line)]"
                    data-testid="shared-item"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                        line.checked ? "bg-accent text-bg" : "shadow-[inset_0_0_0_1.5px_var(--color-line)]"
                      }`}
                    >
                      {line.checked ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-semibold ${line.checked ? "text-fg-soft line-through decoration-accent decoration-2" : ""}`}>
                        {line.name}
                      </span>
                      <span className={`mt-0.5 block text-sm text-fg-soft ${line.checked ? "line-through decoration-accent" : ""}`}>
                        {line.need} · {line.buy}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
