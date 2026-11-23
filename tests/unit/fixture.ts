import type { Catalog, Ingredient, Recipe } from "@/lib/catalog/types";
import type { PlanRequest } from "@/lib/planner/types";

const ing = (id: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name: id,
  aisle: "pantry",
  unit: "cup",
  pkg_qty: 4,
  pkg_cents: 200,
  pkg_label: "bag",
  kind: "plant",
  staple: false,
  spicy: false,
  allergens: [],
  ...over,
});

export const INGREDIENTS: Ingredient[] = [
  ing("rice", { pkg_qty: 10, pkg_cents: 250 }),
  ing("beans", { unit: "can", pkg_qty: 1, pkg_cents: 90, pkg_label: "15 oz can" }),
  ing("chicken", { unit: "lb", pkg_qty: 1, pkg_cents: 300, pkg_label: "per lb", kind: "poultry", aisle: "meat" }),
  ing("beef", { unit: "lb", pkg_qty: 1, pkg_cents: 600, pkg_label: "per lb", kind: "beef", aisle: "meat" }),
  ing("steak", { unit: "lb", pkg_qty: 1, pkg_cents: 1400, pkg_label: "per lb", kind: "beef", aisle: "meat" }),
  ing("pasta", { unit: "lb", pkg_qty: 1, pkg_cents: 120, pkg_label: "1 lb box", allergens: ["gluten"] }),
  ing("eggs", { unit: "each", pkg_qty: 12, pkg_cents: 300, pkg_label: "dozen", kind: "egg", allergens: ["eggs"] }),
  ing("cheese", { pkg_qty: 2, pkg_cents: 280, kind: "dairy", allergens: ["dairy"] }),
  ing("peanut_butter", { unit: "tbsp", pkg_qty: 28, pkg_cents: 250, allergens: ["peanuts"] }),
  ing("onion", { unit: "each", pkg_qty: 1, pkg_cents: 80, aisle: "produce" }),
  ing("hot_sauce", { unit: "tbsp", pkg_qty: 20, pkg_cents: 200, spicy: true, staple: true }),
  ing("salt", { unit: "tsp", pkg_qty: 100, pkg_cents: 100, staple: true }),
  ing("oats", { pkg_qty: 15, pkg_cents: 400 }),
  ing("bread", { unit: "slice", pkg_qty: 20, pkg_cents: 250, allergens: ["gluten"] }),
];

const recipe = (slug: string, ingredients: [string, number][], over: Partial<Recipe> = {}): Recipe => ({
  slug,
  name: slug,
  meal_type: "dinner",
  diet_tags: [],
  servings: 4,
  prep_minutes: 30,
  batch_friendly: false,
  description: "",
  steps: ["Cook.", "Serve.", "Eat."],
  ingredients: ingredients.map(([id, qty]) => ({ id, qty })),
  photo_url: "https://images.unsplash.com/photo-1",
  photo_credit: { name: "x", url: "https://unsplash.com/@x" },
  ...over,
});

export const RECIPES: Recipe[] = [
  recipe("rice-beans", [["rice", 2], ["beans", 2], ["onion", 1], ["salt", 1]], { diet_tags: ["vegetarian"], prep_minutes: 20 }),
  recipe("bean-chili", [["beans", 3], ["onion", 1], ["hot_sauce", 1]], { diet_tags: ["vegetarian"], batch_friendly: true, prep_minutes: 50 }),
  recipe("egg-fried-rice", [["rice", 2], ["eggs", 4], ["onion", 1]], { diet_tags: ["vegetarian"], prep_minutes: 15 }),
  recipe("cheesy-pasta", [["pasta", 1], ["cheese", 2]], { diet_tags: ["vegetarian"], prep_minutes: 20 }),
  recipe("pasta-beans", [["pasta", 1], ["beans", 1], ["onion", 1]], { diet_tags: ["vegetarian"] }),
  recipe("peanut-rice", [["rice", 2], ["peanut_butter", 4], ["onion", 1]], { diet_tags: ["vegetarian"] }),
  recipe("cheese-omelet", [["eggs", 8], ["cheese", 1]], { diet_tags: ["vegetarian", "keto", "high_protein"], prep_minutes: 10 }),
  recipe("bean-rice-bake", [["rice", 2], ["beans", 2], ["cheese", 1]], { diet_tags: ["vegetarian"], batch_friendly: true, prep_minutes: 55 }),
  recipe("chicken-rice", [["chicken", 1.5], ["rice", 2], ["onion", 1]], { diet_tags: ["high_protein"] }),
  recipe("chicken-pasta", [["chicken", 1], ["pasta", 1], ["cheese", 1]]),
  recipe("roast-chicken", [["chicken", 2], ["onion", 2]], { diet_tags: ["keto", "high_protein"], prep_minutes: 60 }),
  recipe("beef-tacos", [["beef", 1], ["cheese", 1], ["onion", 1], ["hot_sauce", 2]], { diet_tags: ["high_protein"] }),
  recipe("beef-rice", [["beef", 1], ["rice", 2]]),
  recipe("steak-night", [["steak", 2], ["onion", 1]], { diet_tags: ["keto", "high_protein"] }),
  recipe("steak-pasta", [["steak", 1.5], ["pasta", 1]]),
  recipe("oatmeal", [["oats", 2]], { meal_type: "breakfast", diet_tags: ["vegetarian"], prep_minutes: 5 }),
  recipe("eggs-toast", [["eggs", 8], ["bread", 8]], { meal_type: "breakfast", diet_tags: ["vegetarian"], prep_minutes: 10 }),
  recipe("pb-toast", [["bread", 8], ["peanut_butter", 8]], { meal_type: "breakfast", diet_tags: ["vegetarian"], prep_minutes: 5 }),
  recipe("bean-wraps", [["beans", 2], ["cheese", 1], ["bread", 8]], { meal_type: "lunch", diet_tags: ["vegetarian"], prep_minutes: 10 }),
  recipe("egg-sandwich", [["eggs", 6], ["bread", 8]], { meal_type: "lunch", diet_tags: ["vegetarian"], prep_minutes: 10 }),
  recipe("chicken-sandwich", [["chicken", 1], ["bread", 8]], { meal_type: "lunch", prep_minutes: 15 }),
];

export const fixture: Catalog = {
  ingredients: new Map(INGREDIENTS.map((i) => [i.id, i])),
  recipes: RECIPES,
};

export const get = (id: string) => fixture.ingredients.get(id)!;

export const request = (over: Partial<PlanRequest> = {}): PlanRequest => ({
  budgetCents: 10000,
  householdSize: 4,
  diet: "none",
  cookTime: "normal",
  includeBreakfast: false,
  includeLunch: false,
  pantry: new Set(["salt", "hot_sauce"]),
  allergens: [],
  dislikes: [],
  seed: 1,
  ...over,
});
