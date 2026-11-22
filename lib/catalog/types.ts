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
}

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
  steps: string[];
  ingredients: RecipeIngredient[];
  photo_url: string;
  photo_credit: { name: string; url: string };
}

export interface Catalog {
  ingredients: Map<string, Ingredient>;
  recipes: Recipe[];
}
