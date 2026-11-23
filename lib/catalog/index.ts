import generated from "./catalog.generated.json";
import type { Catalog, Ingredient, Recipe } from "./types";

const data = generated as unknown as { ingredients: Ingredient[]; recipes: Recipe[] };

/** The bundled recipe catalog. Server-side only: keep it out of client components. */
export const catalog: Catalog = {
  ingredients: new Map(data.ingredients.map((i) => [i.id, i])),
  recipes: data.recipes,
};

const bySlug = new Map(data.recipes.map((r) => [r.slug, r]));

export function recipeBySlug(slug: string): Recipe | undefined {
  return bySlug.get(slug);
}

/** Unsplash CDN URL sized for the slot it is shown in. */
export function photoSrc(photoUrl: string, width: number, height?: number): string {
  const params = new URLSearchParams({ auto: "format", fit: "crop", q: "70", w: String(width) });
  if (height) params.set("h", String(height));
  return `${photoUrl}?${params}`;
}
