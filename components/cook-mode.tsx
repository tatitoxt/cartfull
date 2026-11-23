"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";

const RANGE = String.raw`(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?`;

/** Longest duration mentioned in a step, in seconds. Handles minutes, hours
 * ("7 hours", "1 hour 45 minutes"), seconds and ranges ("90–105 minutes"). */
function stepSeconds(text: string): number | null {
  let best = 0;
  const top = (a?: string, b?: string) => Math.max(Number(a ?? 0), Number(b ?? 0));
  let match: RegExpExecArray | null;
  const hours = new RegExp(`${RANGE}\\s*(?:hours?|hrs?|horas?)(?:\\s*(?:and\\s+)?${RANGE}\\s*(?:minutes?|mins?|minutos?))?`, "gi");
  const minutes = new RegExp(`${RANGE}\\s*(?:minutes?|mins?|minutos?|min)\\b`, "gi");
  const seconds = new RegExp(`${RANGE}\\s*(?:seconds?|secs?|segundos?)\\b`, "gi");
  while ((match = hours.exec(text))) best = Math.max(best, top(match[1], match[2]) * 3600 + top(match[3], match[4]) * 60);
  while ((match = minutes.exec(text))) best = Math.max(best, top(match[1], match[2]) * 60);
  while ((match = seconds.exec(text))) best = Math.max(best, top(match[1], match[2]));
  return best > 0 ? best : null;
}

function formatClock(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/** Tap-to-start countdown for a step with a stated time; resets on step change. */
function StepTimer({ seconds, resetKey }: { seconds: number; resetKey: number }) {
  const m = useMessages();
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  const endAt = useRef(0);

  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
  }, [seconds, resetKey]);

  // Count from a wall-clock deadline, not ticks: a suspended browser resumes
  // with the right remaining time instead of a timer that finished late.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft(Math.max(0, Math.round((endAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (left <= 0) {
      setLeft(seconds);
      setRunning(false);
      return;
    }
    if (!running) endAt.current = Date.now() + left * 1000;
    setRunning((r) => !r);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`tnum mt-5 rounded-full px-5 py-3 text-xl font-semibold shadow-[inset_0_0_0_1.5px_var(--color-line)] ${
        left <= 0 ? "bg-accent text-bg" : running ? "bg-accent/15 text-accent" : "bg-surface text-fg"
      }`}
      aria-pressed={running}
      data-testid="step-timer"
    >
      {left <= 0 ? m.cookMode.timerDone : left === seconds && !running ? `\u25B6 ${formatClock(seconds)}` : `${running ? "\u275A\u275A" : "\u25B6"} ${formatClock(left)}`}
    </button>
  );
}

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
      <div>
        <p className="mt-6 text-3xl font-medium leading-snug sm:text-4xl">{steps[index - 1]}</p>
        {stepSeconds(steps[index - 1]) ? <StepTimer seconds={stepSeconds(steps[index - 1])!} resetKey={index} /> : null}
      </div>
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
