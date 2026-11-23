import table from "../../data/nutrition.json";
import type { Recipe } from "./types";

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Row {
  /** Grams in one of the ingredient's units. */
  g: number;
  /** Per 100 g, USDA FoodData Central values. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const rows = table as unknown as Record<string, Row>;

/** Estimated macros for one serving of a recipe; ingredients without data are skipped. */
export function nutritionPerServing(recipe: Recipe): Nutrition | null {
  const total: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let covered = 0;
  for (const ri of recipe.ingredients) {
    const row = rows[ri.id];
    if (!row) continue;
    const factor = (ri.qty * row.g) / 100;
    total.kcal += row.kcal * factor;
    total.protein += row.protein * factor;
    total.carbs += row.carbs * factor;
    total.fat += row.fat * factor;
    covered += 1;
  }
  if (!covered) return null;
  const round = (v: number) => Math.round(v / recipe.servings);
  return { kcal: round(total.kcal), protein: round(total.protein), carbs: round(total.carbs), fat: round(total.fat) };
}
