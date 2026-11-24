import { z } from "zod";
import { ALLERGENS, EQUIPMENT } from "../catalog/types";
import { COUNTRY_CODES } from "../i18n/countries";
import { DISLIKE_KEYS } from "../planner/dislikes";
import { COOK_TIMES, DIETS } from "../planner/types";
import type { Lang } from "../catalog/localize";
import { MESSAGES } from "../i18n/messages";

export const BUDGET_MIN_CENTS = 3000;
export const BUDGET_MAX_CENTS = 40000;

export const DEFAULTS = {
  weekly_budget_cents: 10000,
  household_size: 2,
  diet: "none",
  cook_time: "normal",
  include_breakfast: false,
  include_lunch: false,
  country: "US",
  lang: "en",
  units: "imperial",
  equipment: ["stovetop", "oven", "microwave"],
} as const;

/** Rough weekly grocery spend for a US household that does not plan, used when the shopper skips the question. */
export function typicalSpendCents(householdSize: number): number {
  return Math.round((55 + 62 * householdSize) * 100);
}

export const answersSchema = z.object({
  weekly_budget_cents: z.number().int().min(BUDGET_MIN_CENTS).max(BUDGET_MAX_CENTS),
  usual_spend_cents: z
    .number()
    .int()
    .min(0)
    .max(300000)
    .nullable()
    // Enter-submit can bypass the field's blur clamp: floor it here too.
    .transform((v) => (v === null ? null : Math.max(1000, v))),
  household_size: z.number().int().min(1).max(8),
  diet: z.enum(DIETS),
  cook_time: z.enum(COOK_TIMES),
  include_breakfast: z.boolean(),
  include_lunch: z.boolean(),
  allergens: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length),
  dislikes: z.array(z.string().refine((key) => DISLIKE_KEYS.includes(key))).max(DISLIKE_KEYS.length),
  pantry: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).max(400),
  country: z.enum(COUNTRY_CODES).default(DEFAULTS.country),
  lang: z.enum(["en", "es"]).default(DEFAULTS.lang),
  units: z.enum(["imperial", "metric"]).default(DEFAULTS.units),
  equipment: z.array(z.enum(EQUIPMENT)).max(EQUIPMENT.length).default([...DEFAULTS.equipment]),
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
  country: string;
  lang: Answers["lang"];
  units: Answers["units"];
  equipment: Answers["equipment"];
  notify_plan: boolean;
  notify_shopping: boolean;
  notify_receipt: boolean;
  onboarded_at: string | null;
}

export const ALLERGEN_LABELS: Record<Lang, Record<(typeof ALLERGENS)[number], string>> = {
  en: MESSAGES.en.preferences.allergens,
  es: MESSAGES.es.preferences.allergens,
};

export const DIET_LABELS: Record<Lang, Record<Answers["diet"], { label: string; hint: string }>> = {
  en: MESSAGES.en.preferences.diets,
  es: MESSAGES.es.preferences.diets,
};

export const COOK_TIME_LABELS: Record<Lang, Record<Answers["cook_time"], { label: string; hint: string }>> = {
  en: MESSAGES.en.preferences.cookTimes,
  es: MESSAGES.es.preferences.cookTimes,
};
