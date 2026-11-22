import { z } from "zod";
import { ALLERGENS } from "../catalog/types";
import { DISLIKE_KEYS } from "../planner/dislikes";
import { COOK_TIMES, DIETS } from "../planner/types";

export const BUDGET_MIN_CENTS = 3000;
export const BUDGET_MAX_CENTS = 40000;

export const DEFAULTS = {
  weekly_budget_cents: 10000,
  household_size: 2,
  diet: "none",
  cook_time: "normal",
  include_breakfast: false,
  include_lunch: false,
} as const;

/** Rough weekly grocery spend for a US household that does not plan, used when the shopper skips the question. */
export function typicalSpendCents(householdSize: number): number {
  return Math.round((55 + 62 * householdSize) * 100);
}

export const answersSchema = z.object({
  weekly_budget_cents: z.number().int().min(BUDGET_MIN_CENTS).max(BUDGET_MAX_CENTS),
  usual_spend_cents: z.number().int().min(1000).max(300000).nullable(),
  household_size: z.number().int().min(1).max(8),
  diet: z.enum(DIETS),
  cook_time: z.enum(COOK_TIMES),
  include_breakfast: z.boolean(),
  include_lunch: z.boolean(),
  allergens: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length),
  dislikes: z.array(z.string().refine((key) => DISLIKE_KEYS.includes(key))).max(DISLIKE_KEYS.length),
  pantry: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).max(400),
});

export type Answers = z.infer<typeof answersSchema>;

export interface Profile {
  id: string;
  email: string | null;
  weekly_budget_cents: number | null;
  usual_spend_cents: number | null;
  household_size: number;
  diet: Answers["diet"];
  cook_time: Answers["cook_time"];
  include_breakfast: boolean;
  include_lunch: boolean;
  allergens: Answers["allergens"];
  dislikes: string[];
  onboarded_at: string | null;
}

export const ALLERGEN_LABELS: Record<(typeof ALLERGENS)[number], string> = {
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  dairy: "Dairy",
  eggs: "Eggs",
  gluten: "Gluten",
  soy: "Soy",
  fish: "Fish",
  shellfish: "Shellfish",
  sesame: "Sesame",
};

export const DIET_LABELS: Record<Answers["diet"], { label: string; hint: string }> = {
  none: { label: "No preference", hint: "A bit of everything" },
  vegetarian: { label: "Vegetarian", hint: "No meat or fish" },
  keto: { label: "Keto", hint: "Low carb, no grains" },
  high_protein: { label: "High protein", hint: "30 g or more per dinner" },
};

export const COOK_TIME_LABELS: Record<Answers["cook_time"], { label: string; hint: string }> = {
  fast: { label: "Fast", hint: "On the table in 25 minutes" },
  normal: { label: "Normal", hint: "Up to 45 minutes" },
  batch: { label: "Weekend batch", hint: "Cook big once, reheat on weeknights" },
};
