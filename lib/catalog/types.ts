export const AISLES = [
  "produce",
  "meat",
  "seafood",
  "dairy",
  "bakery",
  "pantry",
  "canned",
  "frozen",
  "condiments",
  "spices",
] as const;
export type Aisle = (typeof AISLES)[number];

export const ALLERGENS = [
  "peanuts",
  "tree_nuts",
  "dairy",
  "eggs",
  "gluten",
  "soy",
  "fish",
  "shellfish",
  "sesame",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export type IngredientKind =
  | "plant"
  | "poultry"
  | "beef"
  | "pork"
  | "fish"
  | "shellfish"
  | "egg"
  | "dairy";

export const MEAT_KINDS: readonly IngredientKind[] = [
  "poultry",
  "beef",
  "pork",
  "fish",
  "shellfish",
];

export interface Ingredient {
  id: string;
  name: string;
  /** Spanish name, lower-case first letter unless a proper noun is involved. */
  name_es?: string;
  aisle: Aisle;
  /** Unit every recipe uses for this ingredient. */
  unit: string;
  /** How many `unit`s one store package holds. */
  pkg_qty: number;
  /** Estimated shelf price of one package, in cents. */
  pkg_cents: number;
  pkg_label: string;
  kind: IngredientKind;
  /** Kitchen basics assumed to be in the pantry unless the user says otherwise. */
  staple: boolean;
  spicy: boolean;
  allergens: Allergen[];
}

export const MEAL_TYPES = ["dinner", "lunch", "breakfast"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const DIET_TAGS = ["vegetarian", "keto", "high_protein"] as const;
export type DietTag = (typeof DIET_TAGS)[number];

export interface RecipeIngredient {
  id: string;
  qty: number;
  note?: string;
  note_es?: string;
}

/** What a kitchen needs to cook a recipe. A plan only uses recipes the household can make. */
export const EQUIPMENT = [
  "stovetop",
  "oven",
  "microwave",
  "air_fryer",
  "slow_cooker",
  "pressure_cooker",
  "blender",
  "grill",
  "toaster",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Recipe {
  slug: string;
  name: string;
  meal_type: MealType;
  diet_tags: DietTag[];
  servings: number;
  /** Total minutes from start to table. */
  prep_minutes: number;
  /** Scales up well and keeps for leftovers. */
  batch_friendly: boolean;
  description: string;
  /** Oven and oil temperatures are written as {425F} so they can be shown in °F or °C. */
  steps: string[];
  ingredients: RecipeIngredient[];
  name_es?: string;
  description_es?: string;
  /** Same steps, same order, in Spanish. */
  steps_es?: string[];
  /** Appliances the recipe cannot be made without. Empty for no-cook recipes. */
  equipment?: Equipment[];
  /** Hands-on minutes, the part of `prep_minutes` spent chopping and stirring. */
  active_minutes?: number;
  /** One practical line: how to store it, stretch it or swap something. */
  tip?: string;
  tip_es?: string;
  photo_url: string;
  photo_credit: { name: string; url: string };
}

export interface Catalog {
  ingredients: Map<string, Ingredient>;
  recipes: Recipe[];
}
