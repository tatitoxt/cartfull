"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useMessages } from "@/lib/i18n/locale-provider";

const THEME_KEY = "cartfull:theme";
const ACCENT_KEY = "cartfull:accent";
const THEMES = ["dark", "light", "auto"] as const;
const ACCENTS = ["lime", "verde", "celeste", "violeta"] as const;
const ACCENT_COLORS: Record<(typeof ACCENTS)[number], string> = {
  lime: "#a8e24b",
  verde: "#2fd681",
  celeste: "#4cc3f7",
  violeta: "#a78bfa",
};

type Theme = (typeof THEMES)[number];
type Accent = (typeof ACCENTS)[number];

// localStorage throws when the browser blocks storage; the picker then just
// keeps the in-memory choice for the page view instead of crashing the app.
const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* no storage — the choice still applies until the page is left */
    }
  },
};

/** Arrow keys move focus and selection between the radios of a group. */
function radioGroupKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index === -1) return;
  const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
  const next = buttons[(index + delta + buttons.length) % buttons.length];
  next.focus();
  next.click();
}

/** Device-level appearance: dark/light/auto plus the accent color. Kept in localStorage. */
export function ThemePicker() {
  const m = useMessages();
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccent] = useState<Accent>("lime");

  useEffect(() => {
    setTheme((storage.get(THEME_KEY) as Theme) || "dark");
    setAccent((storage.get(ACCENT_KEY) as Accent) || "lime");
  }, []);

  const pickTheme = (next: Theme) => {
    setTheme(next);
    storage.set(THEME_KEY, next);
    document.documentElement.dataset.theme = next;
  };
  const pickAccent = (next: Accent) => {
    setAccent(next);
    storage.set(ACCENT_KEY, next);
    document.documentElement.dataset.accent = next;
  };

  return (
    <section aria-labelledby="appearance-title" className="mt-8 rounded-card bg-surface p-5 shadow-[inset_0_0_0_1.5px_var(--color-line)]">
      <h2 id="appearance-title" className="text-2xl">
        {m.account.appearance.title}
      </h2>
      <div className="mt-4">
        <p className="text-sm font-medium text-fg-soft">{m.account.appearance.theme}</p>
        <div
          className="mt-2 inline-flex rounded-full bg-surface p-1 shadow-[inset_0_0_0_1px_var(--color-line)]"
          role="radiogroup"
          aria-label={m.account.appearance.theme}
          onKeyDown={radioGroupKeys}
        >
          {THEMES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={theme === option}
              tabIndex={theme === option ? 0 : -1}
              onClick={() => pickTheme(option)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold capitalize transition-colors ${
                theme === option ? "bg-fg text-bg" : "text-fg-soft hover:text-fg"
              }`}
              data-testid={`theme-${option}`}
            >
              {m.account.appearance.themes[option]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <p className="text-sm font-medium text-fg-soft">{m.account.appearance.accent}</p>
        <div className="mt-2 flex gap-3" role="radiogroup" aria-label={m.account.appearance.accent} onKeyDown={radioGroupKeys}>
          {ACCENTS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={accent === option}
              tabIndex={accent === option ? 0 : -1}
              aria-label={m.account.appearance.accents[option]}
              title={m.account.appearance.accents[option]}
              onClick={() => pickAccent(option)}
              className={`size-10 rounded-full transition-transform ${accent === option ? "scale-110 shadow-[0_0_0_3px_var(--color-bg),0_0_0_5px_var(--color-accent)]" : "hover:scale-105"}`}
              style={{ background: ACCENT_COLORS[option] }}
              data-testid={`accent-${option}`}
            />
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-fg-faint">{m.account.appearance.note}</p>
    </section>
  );
}
