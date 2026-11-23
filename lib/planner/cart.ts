import type { Ingredient } from "../catalog/types";
import type { Cart, CartLine, MealAssignment } from "./types";

const EPS = 1e-6;
const EMPTY_OWNED: ReadonlyMap<string, number> = new Map();

/** Meat and fish priced per pound are bought by weight, in quarter-pound steps. */
export function soldByWeight(ing: Ingredient): boolean {
  return ing.unit === "lb" && ing.pkg_label.startsWith("per lb");
}

/**
 * How much of an ingredient the store makes you buy to cover `qty` units:
 * whole packages, or quarter pounds for by-weight items.
 */
export function packagesFor(ing: Ingredient, qty: number): number {
  if (qty <= EPS) return 0;
  if (soldByWeight(ing)) return Math.ceil((qty / ing.pkg_qty) * 4 - EPS) / 4;
  return Math.ceil(qty / ing.pkg_qty - EPS);
}

/** Shelf price in cents of covering `qty` units. */
export function purchaseCents(ing: Ingredient, qty: number): number {
  return Math.round(packagesFor(ing, qty) * ing.pkg_cents);
}

/**
 * Consolidates every meal's ingredients into one shopping cart priced in whole
 * packages. Lines the household already has stay on the cart but cost nothing.
 */
export function buildCart(
  meals: readonly MealAssignment[],
  ingredients: ReadonlyMap<string, Ingredient>,
  have: ReadonlySet<string>,
  haveQty: ReadonlyMap<string, number> = EMPTY_OWNED,
): Cart {
  const byId = new Map<string, { qty: number; usedIn: Set<string> }>();
  for (const meal of meals) {
    const scale = meal.servings / meal.recipe.servings;
    for (const ri of meal.recipe.ingredients) {
      const entry = byId.get(ri.id) ?? { qty: 0, usedIn: new Set<string>() };
      entry.qty += ri.qty * scale;
      entry.usedIn.add(meal.recipe.slug);
      byId.set(ri.id, entry);
    }
  }

  const lines: CartLine[] = [];
  let totalCents = 0;
  for (const [id, { qty, usedIn }] of byId) {
    const ingredient = ingredients.get(id);
    if (!ingredient) throw new Error(`Unknown ingredient "${id}"`);
    const owned = Math.min(haveQty.get(id) ?? (have.has(id) ? qty : 0), qty);
    const isHave = owned >= qty - EPS;
    const buyQty = isHave ? 0 : qty - owned;
    const packages = packagesFor(ingredient, buyQty);
    const cents = purchaseCents(ingredient, buyQty);
    if (!isHave) totalCents += cents;
    lines.push({ ingredient, qty, packages, cents, fullCents: purchaseCents(ingredient, qty), have: isHave, haveQty: owned, usedIn: [...usedIn] });
  }
  lines.sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
  return { lines, totalCents };
}

/** Ingredient ids that count as "already in the kitchen" for a new household. */
export function stapleIds(ingredients: ReadonlyMap<string, Ingredient>): string[] {
  return [...ingredients.values()].filter((i) => i.staple).map((i) => i.id);
}
