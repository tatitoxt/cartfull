import type { Allergen, Equipment, Ingredient, MealType, Recipe } from "../catalog/types";

export const DIETS = ["none", "vegetarian", "keto", "high_protein"] as const;
export type Diet = (typeof DIETS)[number];

export const COOK_TIMES = ["fast", "normal", "batch"] as const;
export type CookTime = (typeof COOK_TIMES)[number];

export interface PlanRequest {
  budgetCents: number;
  householdSize: number;
  diet: Diet;
  cookTime: CookTime;
  includeBreakfast: boolean;
  includeLunch: boolean;
  /** Ingredient ids the household already has; they cost nothing. */
  pantry: ReadonlySet<string>;
  allergens: readonly Allergen[];
  /** Keys from DISLIKE_OPTIONS. */
  dislikes: readonly string[];
  /** Appliances in the kitchen. Recipes that need another one are left out. Omit for no limit. */
  equipment?: readonly Equipment[];
  /** Same seed, same plan. */
  seed: number;
  /** Recipes to steer away from, e.g. last week's dinners. */
  avoidSlugs?: ReadonlySet<string>;
}

export interface MealAssignment {
  day: number;
  slot: MealType;
  recipe: Recipe;
  servings: number;
}

export interface CartLine {
  ingredient: Ingredient;
  /** Total amount the week's recipes use, in the ingredient's unit. */
  qty: number;
  /** Packages to buy: whole numbers, or pounds in quarter steps for by-weight items. */
  packages: number;
  /** Shelf cost of those packages, in cents. */
  cents: number;
  /** Already at home: listed but not counted in the total. */
  have: boolean;
  usedIn: string[];
}

export interface Cart {
  lines: CartLine[];
  /** Sum of every line the household still has to buy, in cents. */
  totalCents: number;
}

export interface Plan {
  meals: MealAssignment[];
  cart: Cart;
  totalCents: number;
}

export class BudgetTooLowError extends Error {
  readonly code = "BUDGET_TOO_LOW";
  constructor(
    readonly budgetCents: number,
    /** Cheapest week the planner could build for this household. */
    readonly minimumCents: number,
  ) {
    super(
      `No plan fits $${(budgetCents / 100).toFixed(2)}; the cheapest week for this household is about $${(minimumCents / 100).toFixed(2)}.`,
    );
    this.name = "BudgetTooLowError";
  }
}

export class NotEnoughRecipesError extends Error {
  readonly code = "NOT_ENOUGH_RECIPES";
  constructor(readonly slot: MealType, readonly available: number, readonly needed: number) {
    super(`Only ${available} ${slot} recipes match these preferences; ${needed} are needed.`);
    this.name = "NotEnoughRecipesError";
  }
}
