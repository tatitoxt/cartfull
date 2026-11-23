import { quantity } from "../format";
import type { Recipe, RecipeIngredient, Ingredient } from "./types";

export type Lang = "en" | "es";
export type Units = "imperial" | "metric";

const round = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

/** 0.25 lb -> "115 g", 2.5 lb -> "1.1 kg". */
export function grams(value: number, lang: Lang): string {
  if (value < 1000) return `${round(value, 5)} g`;
  const kg = Math.round(value / 100) / 10;
  return `${lang === "es" ? String(kg).replace(".", ",") : kg} kg`;
}

function millilitres(value: number, lang: Lang): string {
  if (value < 1000) return `${round(value, 5)} ml`;
  const litres = Math.round(value / 100) / 10;
  return `${lang === "es" ? String(litres).replace(".", ",") : litres} L`;
}

const CONTAINERS: Record<string, string> = {
  bag: "bolsa",
  ball: "bola",
  block: "bloque",
  bottle: "botella",
  box: "caja",
  bunch: "atado",
  can: "lata",
  canister: "bote",
  carton: "cartón",
  jar: "frasco",
  pack: "paquete",
  packet: "sobre",
  roll: "rollo",
  rope: "ristra",
  tin: "lata",
  tub: "pote",
};
const POURED = new Set(["bottle", "carton"]);

const FIXED: Record<string, { en: string; es: string; metric?: { en: string; es: string } }> = {
  each: { en: "each", es: "por unidad" },
  jar: { en: "jar", es: "frasco" },
  "1 bunch": { en: "1 bunch", es: "1 atado" },
  "1 head": { en: "1 head", es: "1 cabeza" },
  "1 loaf": { en: "1 loaf", es: "1 pan" },
  "1 dozen": { en: "1 dozen", es: "1 docena" },
  "1 small root": { en: "1 small root", es: "1 raíz chica" },
  "1 pint": { en: "1 pint", es: "1 bandeja", metric: { en: "1 punnet", es: "1 bandeja" } },
  "half gallon": { en: "half gallon", es: "medio galón", metric: { en: "1.9 L", es: "1,9 L" } },
  "per lb": { en: "per lb", es: "por libra", metric: { en: "per 455 g", es: "cada 455 g" } },
  "per lb, frozen": {
    en: "per lb, frozen",
    es: "por libra, congelado",
    metric: { en: "per 455 g, frozen", es: "cada 455 g, congelado" },
  },
};

/**
 * A package label ("16 oz bag") in the reader's language and units ("bolsa de 455 g").
 * Returns null when the label is not in one of the forms the catalog allows.
 */
export function packageLabel(label: string, lang: Lang, units: Units): string | null {
  const fixed = FIXED[label];
  if (fixed) return (units === "metric" && fixed.metric ? fixed.metric : fixed)[lang];

  const count = label.match(/^(\d+) (pack|slices)$/);
  if (count) {
    if (lang === "en") return label;
    return count[2] === "slices" ? `${count[1]} fetas` : `paquete de ${count[1]}`;
  }

  const about = label.match(/^about (\d+(?:\.\d+)?) lb$/);
  if (about) {
    const weight = units === "metric" ? grams(Number(about[1]) * 453.6, lang) : `${about[1]} lb`;
    return lang === "es" ? `unos ${weight}` : `about ${weight}`;
  }

  const sized = label.match(/^(\d+(?:\.\d+)?) (oz|lb) ([a-z]+)$/);
  if (!sized || !CONTAINERS[sized[3]]) return null;
  const [, amount, unit, container] = sized;
  let size = `${amount} ${unit}`;
  if (units === "metric") {
    size =
      unit === "oz" && POURED.has(container)
        ? millilitres(Number(amount) * 29.57, lang)
        : grams(Number(amount) * (unit === "lb" ? 453.6 : 28.35), lang);
  }
  return lang === "es" ? `${CONTAINERS[container]} de ${size}` : `${size} ${container}`;
}

const UNIT_WORDS: Record<string, { en: [string, string]; es: [string, string] }> = {
  lb: { en: ["lb", "lb"], es: ["lb", "lb"] },
  oz: { en: ["oz", "oz"], es: ["oz", "oz"] },
  cup: { en: ["cup", "cups"], es: ["taza", "tazas"] },
  tbsp: { en: ["tbsp", "tbsp"], es: ["cda", "cdas"] },
  tsp: { en: ["tsp", "tsp"], es: ["cdta", "cdtas"] },
  clove: { en: ["clove", "cloves"], es: ["diente", "dientes"] },
  each: { en: ["", ""], es: ["", ""] },
  can: { en: ["can", "cans"], es: ["lata", "latas"] },
  jar: { en: ["jar", "jars"], es: ["frasco", "frascos"] },
  slice: { en: ["slice", "slices"], es: ["feta", "fetas"] },
  head: { en: ["head", "heads"], es: ["cabeza", "cabezas"] },
  bunch: { en: ["bunch", "bunches"], es: ["atado", "atados"] },
  bag: { en: ["bag", "bags"], es: ["bolsa", "bolsas"] },
  pkg: { en: ["pkg", "pkgs"], es: ["paquete", "paquetes"] },
  pack: { en: ["pack", "packs"], es: ["paquete", "paquetes"] },
  box: { en: ["box", "boxes"], es: ["caja", "cajas"] },
  block: { en: ["block", "blocks"], es: ["bloque", "bloques"] },
  stalk: { en: ["stalk", "stalks"], es: ["tallo", "tallos"] },
  heart: { en: ["heart", "hearts"], es: ["corazón", "corazones"] },
  pint: { en: ["pint", "pints"], es: ["bandeja", "bandejas"] },
};

/** "1½ lb" or "680 g": an amount in the ingredient's unit, shown the way the reader measures. */
export function amount(qty: number, unit: string, lang: Lang, units: Units): string {
  if (units === "metric" && unit === "lb") return grams(qty * 453.6, lang);
  if (units === "metric" && unit === "oz") return grams(qty * 28.35, lang);
  const words = UNIT_WORDS[unit]?.[lang];
  const word = words ? (qty > 1 ? words[1] : words[0]) : unit;
  return word ? `${quantity(qty)} ${word}` : quantity(qty);
}

/** Turns {425F} into "425°F" or "220°C". */
export function temperatures(text: string, units: Units): string {
  return text.replace(/\{(\d{2,3})F\}/g, (_, f: string) =>
    units === "metric" ? `${Math.round(((Number(f) - 32) * 5) / 9 / 10) * 10}°C` : `${f}°F`,
  );
}

export function ingredientName(ingredient: Ingredient, lang: Lang): string {
  return (lang === "es" && ingredient.name_es) || ingredient.name;
}

export function ingredientNote(item: RecipeIngredient, lang: Lang): string | undefined {
  return (lang === "es" && item.note_es) || item.note;
}

export interface RecipeText {
  name: string;
  description: string;
  steps: string[];
  tip?: string;
}

/** A recipe's words in the reader's language and units, falling back to English. */
export function recipeText(recipe: Recipe, lang: Lang, units: Units): RecipeText {
  const es = lang === "es";
  const steps = (es && recipe.steps_es?.length === recipe.steps.length && recipe.steps_es) || recipe.steps;
  const tip = (es && recipe.tip_es) || recipe.tip;
  return {
    name: (es && recipe.name_es) || recipe.name,
    description: (es && recipe.description_es) || recipe.description,
    steps: steps.map((step) => temperatures(step, units)),
    tip: tip ? temperatures(tip, units) : undefined,
  };
}
