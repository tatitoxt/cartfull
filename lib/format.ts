import type { Lang } from "./catalog/localize";
import { MESSAGES } from "./i18n/messages";

const numberLocale = (lang: Lang) => lang === "es" ? "es-AR" : "en-US";
const number = (value: number, lang: Lang, digits: number) =>
  value.toLocaleString(numberLocale(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** $84 for whole dollars, $84.50 otherwise. */
export function money(cents: number, lang: Lang = "en"): string {
  const dollars = cents / 100;
  return `$${number(dollars, lang, Number.isInteger(dollars) ? 0 : 2)}`;
}

/** Always two decimals: $2.10. */
export function moneyExact(cents: number, lang: Lang = "en"): string {
  return `$${number(cents / 100, lang, 2)}`;
}

/** Whole dollars, rounded: $84. */
export function moneyRound(cents: number, lang: Lang = "en"): string {
  return `$${number(Math.round(cents / 100), lang, 0)}`;
}

const FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [0.333, "⅓"],
  [0.5, "½"],
  [0.667, "⅔"],
  [0.75, "¾"],
];

/** 1.5 -> "1½", 0.25 -> "¼", 2.1 -> "2.1". */
export function quantity(qty: number): string {
  const whole = Math.floor(qty + 1e-9);
  const rest = qty - whole;
  if (rest < 0.02) return String(whole);
  for (const [value, glyph] of FRACTIONS) {
    if (Math.abs(rest - value) < 0.02) return whole ? `${whole}${glyph}` : glyph;
  }
  return qty >= 10 ? String(Math.round(qty)) : String(Math.round(qty * 10) / 10);
}

const UNIT_LABELS: Record<string, [string, string]> = {
  lb: ["lb", "lb"],
  oz: ["oz", "oz"],
  cup: ["cup", "cups"],
  tbsp: ["tbsp", "tbsp"],
  tsp: ["tsp", "tsp"],
  clove: ["clove", "cloves"],
  each: ["", ""],
  can: ["can", "cans"],
  jar: ["jar", "jars"],
  slice: ["slice", "slices"],
  head: ["head", "heads"],
  bunch: ["bunch", "bunches"],
  bag: ["bag", "bags"],
  pkg: ["pkg", "pkgs"],
};

export function unitLabel(unit: string, qty: number): string {
  const pair = UNIT_LABELS[unit];
  if (!pair) return unit;
  return qty > 1 ? pair[1] : pair[0];
}

export const DAY_NAMES = {
  en: MESSAGES.en.days.full,
  es: MESSAGES.es.days.full,
};
export const DAY_SHORT = {
  en: MESSAGES.en.days.short,
  es: MESSAGES.es.days.short,
};
