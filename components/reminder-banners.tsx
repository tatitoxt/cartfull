"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "cartfull:reminders-dismissed";

export interface ReminderItem {
  id: string;
  text: string;
  href: string;
  cta: string;
}

/**
 * Stack of in-app reminder pills (plan ahead, finish the list, log the
 * spend). Dismissed ids live in localStorage; since each id carries the
 * week it belongs to, a dismissed reminder re-arms for the next one.
 */
export function ReminderBanners({ items, closeLabel }: { items: ReminderItem[]; closeLabel: string }) {
  // Read localStorage after mount only, like the trial banner.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setDismissed(new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]));
    } catch {
      /* private mode */
    }
    setReady(true);
  }, []);
  if (!ready) return null;

  const visible = items.filter((item) => !dismissed.has(item.id));
  if (!visible.length) return null;

  const close = (id: string) => {
    const next = new Set(dismissed).add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next].slice(-50)));
    } catch {
      /* private mode */
    }
    setDismissed(next);
  };

  return (
    <div className="mt-5 space-y-2">
      {visible.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm"
        >
          <Link href={item.href} className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="text-foreground">{item.text}</span>
            <span className="shrink-0 font-semibold text-amber-300">{item.cta} →</span>
          </Link>
          <button
            type="button"
            onClick={() => close(item.id)}
            aria-label={closeLabel}
            className="shrink-0 rounded-full p-1 text-fg-faint transition-colors hover:bg-amber-400/20 hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
