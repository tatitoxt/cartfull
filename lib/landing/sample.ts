import "server-only";
import { catalog } from "../catalog";
import { recipeCentsPerServing } from "../catalog/cost";
import { stapleIds } from "../planner/cart";
import { estimateWeek, generatePlan } from "../planner/plan";
import type { PlanRequest } from "../planner/types";

const EXTRAS = 1.25;

const household = (householdSize: number): Omit<PlanRequest, "budgetCents"> => ({
  householdSize,
  diet: "none",
  cookTime: "normal",
  includeBreakfast: false,
  includeLunch: false,
  pantry: new Set(stapleIds(catalog.ingredients)),
  allergens: [],
  dislikes: [],
  seed: 20261122,
});

/**
 * Planned weekly grocery cost in cents for households of 1 to 8: all three
 * meals from the catalog at estimated prices, plus an allowance for extras,
 * rounded up to $5.
 */
export function plannedWeekByHousehold(): number[] {
  return Array.from({ length: 8 }, (_, index) => {
    const size = index + 1;
    let cents: number;
    try {
      cents = estimateWeek(catalog, { ...household(size), includeBreakfast: true, includeLunch: true }).typicalCents;
    } catch {
      // Catalog without breakfasts or lunches: dinners are roughly 55% of a planned week.
      try {
        cents = estimateWeek(catalog, household(size)).typicalCents / 0.55;
      } catch {
        cents = (30 + 22 * size) * 100;
      }
    }
    return Math.ceil((cents * EXTRAS) / 500) * 500;
  });
}

export interface SampleWeek {
  people: number;
  budgetCents: number;
  totalCents: number;
  dinners: { name: string; photoUrl: string; centsPerServing: number; minutes: number }[];
}

/** A real plan from the engine for the landing page, fixed so it is the same on every render. */
export function sampleWeek(): SampleWeek | null {
  const people = 4;
  const budgetCents = 11000;
  try {
    const plan = generatePlan(catalog, { ...household(people), budgetCents });
    return {
      people,
      budgetCents,
      totalCents: plan.totalCents,
      dinners: plan.meals
        .filter((meal) => meal.slot === "dinner")
        .sort((a, b) => a.day - b.day)
        .map((meal) => ({
          name: meal.recipe.name,
          photoUrl: meal.recipe.photo_url,
          centsPerServing: Math.round(recipeCentsPerServing(meal.recipe, catalog.ingredients)),
          minutes: meal.recipe.prep_minutes,
        })),
    };
  } catch {
    return null;
  }
}
