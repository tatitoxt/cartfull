"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";

/** Full-screen, big-text step-by-step view that keeps the screen awake while cooking. */
export function CookMode({ title, ingredients, steps }: { title: string; ingredients: string[]; steps: string[] }) {
  const m = useMessages();
  const [open, setOpen] = useState(false);
  // index 0 = ingredients, 1..steps.length = steps, steps.length+1 = done
  const [index, setIndex] = useState(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let released = false;
    const acquire = async () => {
      try {
        if (!released && "wakeLock" in navigator)
          wakeLock.current = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
      } catch {
        /* unsupported or denied */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      document.body.style.overflow = "";
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [open]);

  const total = steps.length;
  const last = total + 1;

  const content =
    index === 0 ? (
      <ul className="mt-6 space-y-4">
        {ingredients.map((line, i) => (
          <li key={i} className="text-xl leading-snug">
            {line}
          </li>
        ))}
      </ul>
    ) : index <= total ? (
      <p className="mt-6 text-3xl font-medium leading-snug sm:text-4xl">{steps[index - 1]}</p>
    ) : (
      <p className="mt-6 text-3xl font-semibold text-accent">{m.cookMode.done}</p>
    );

  if (!open)
    return (
      <button type="button" className="btn btn-primary mt-4" onClick={() => setOpen(true)} data-testid="cook-mode">
        {m.cookMode.open}
      </button>
    );

  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const els = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!els.length) return;
    const first = els[0];
    const lastEl = els[els.length - 1];
    const active = document.activeElement;
    if (!dialogRef.current.contains(active)) {
      first.focus();
      event.preventDefault();
    } else if (event.shiftKey && active === first) {
      lastEl.focus();
      event.preventDefault();
    } else if (!event.shiftKey && active === lastEl) {
      first.focus();
      event.preventDefault();
    }
  };

  return (
    <div
      ref={dialogRef}
      onKeyDown={trapFocus}
      className="fixed inset-0 z-[60] flex flex-col bg-bg p-5 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="cook-mode-screen"
    >
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-lg font-semibold text-fg-soft">{title}</h1>
        <button type="button" className="btn btn-quiet shrink-0 px-4 py-2" onClick={() => { setOpen(false); setIndex(0); }}>
          {m.cookMode.close}
        </button>
      </div>
      <p className="tnum mt-2 text-sm font-semibold uppercase tracking-wider text-fg-faint">
        {index === 0 ? m.cookMode.ingredients : index > total ? m.cookMode.enjoy : fill(m.cookMode.step, { step: index, total })}
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / last) * 100}%` }} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pt-2">{content}</div>
      <div className="flex gap-3 pt-4">
        <button type="button" className="btn btn-quiet flex-1 py-4 text-lg" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          {m.cookMode.back}
        </button>
        <button
          type="button"
          className="btn btn-primary flex-[2] py-4 text-lg"
          onClick={() => (index === last ? (setOpen(false), setIndex(0)) : setIndex((i) => i + 1))}
          data-testid="cook-next"
        >
          {index === last ? m.cookMode.close : index === total ? m.cookMode.finish : m.cookMode.next}
        </button>
      </div>
    </div>
  );
}
