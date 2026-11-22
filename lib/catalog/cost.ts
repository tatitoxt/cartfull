import type { Ingredient, Recipe } from "./types";

/** Cost of the amount a recipe actually uses, in cents (not whole packages). */
export function proratedCents(ing: Ingredient, qty: number): number {
  return (qty / ing.pkg_qty) * ing.pkg_cents;
}

/** Prorated cost of one serving, in cents. Staples included. */
export function recipeCentsPerServing(
  recipe: Recipe,
  ingredients: Map<string, Ingredient>,
): number {
  let total = 0;
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.id);
    if (!ing) throw new Error(`Unknown ingredient "${ri.id}" in ${recipe.slug}`);
    total += proratedCents(ing, ri.qty);
  }
  return total / recipe.servings;
}
