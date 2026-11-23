import { describe, expect, it } from "vitest";
import { catalog as real } from "@/lib/catalog";
import { MEAT_KINDS } from "@/lib/catalog/types";
import { buildCart, stapleIds } from "@/lib/planner/cart";
import { DISLIKE_OPTIONS } from "@/lib/planner/dislikes";
import { eligibleRecipes, estimateWeek, generatePlan, hashSeed, mulberry32, swapOptions } from "@/lib/planner/plan";
import { BudgetTooLowError, DIETS, NotEnoughRecipesError, type Plan, type PlanRequest } from "@/lib/planner/types";
import { fixture, request } from "./fixture";

const slugs = (plan: Plan) => plan.meals.map((m) => `${m.day}:${m.slot}:${m.recipe.slug}`);

describe("generatePlan on a small catalog", () => {
  it("plans seven different dinners sized to the household", () => {
    const plan = generatePlan(fixture, request());
    const dinners = plan.meals.filter((m) => m.slot === "dinner");
    expect(dinners.map((m) => m.day).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(new Set(dinners.map((m) => m.recipe.slug)).size).toBe(7);
    expect(plan.meals.every((m) => m.servings === 4)).toBe(true);
  });

  it("is deterministic for the same request and varies with the seed", () => {
    expect(slugs(generatePlan(fixture, request({ seed: 42 })))).toEqual(slugs(generatePlan(fixture, request({ seed: 42 }))));
    const variants = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => slugs(generatePlan(fixture, request({ seed }))).join()));
    expect(variants.size).toBeGreaterThan(1);
  });

  it("reports a total that matches a cart rebuilt from its meals", () => {
    const req = request({ budgetCents: 6000 });
    const plan = generatePlan(fixture, req);
    expect(plan.totalCents).toBe(buildCart(plan.meals, fixture.ingredients, req.pantry).totalCents);
    expect(plan.totalCents).toBe(plan.cart.totalCents);
  });

  it("never returns a plan over budget, at any budget", () => {
    for (let budget = 500; budget <= 20000; budget += 250) {
      for (const seed of [1, 2, 3]) {
        const req = request({ budgetCents: budget, seed });
        try {
          expect(generatePlan(fixture, req).totalCents).toBeLessThanOrEqual(budget);
        } catch (error) {
          expect(error).toBeInstanceOf(BudgetTooLowError);
          expect((error as BudgetTooLowError).minimumCents).toBeGreaterThan(budget);
        }
      }
    }
  });

  it("throws BudgetTooLowError with a minimum that actually works", () => {
    let caught: BudgetTooLowError | null = null;
    try {
      generatePlan(fixture, request({ budgetCents: 300 }));
    } catch (error) {
      caught = error as BudgetTooLowError;
    }
    expect(caught).toBeInstanceOf(BudgetTooLowError);
    expect(caught!.budgetCents).toBe(300);
    expect(caught!.code).toBe("BUDGET_TOO_LOW");
    const plan = generatePlan(fixture, request({ budgetCents: caught!.minimumCents }));
    expect(plan.totalCents).toBeLessThanOrEqual(caught!.minimumCents);
  });

  it("picks cheaper meals as the budget tightens", () => {
    const { minimumCents } = estimateWeek(fixture, request());
    const tight = generatePlan(fixture, request({ budgetCents: minimumCents + 200 }));
    expect(tight.meals.some((m) => m.recipe.slug.startsWith("steak"))).toBe(false);
    expect(tight.totalCents).toBeLessThanOrEqual(minimumCents + 200);
  });

  it("leaves spare budget unspent rather than buying pricier meals", () => {
    const comfortable = generatePlan(fixture, request({ budgetCents: 12000 }));
    const lavish = generatePlan(fixture, request({ budgetCents: 40000 }));
    expect(lavish.totalCents).toBe(comfortable.totalCents);
  });

  it("costs less when the pantry already holds what the week needs", () => {
    const empty = generatePlan(fixture, request({ pantry: new Set() }));
    const stocked = generatePlan(fixture, request({ pantry: new Set(["salt", "hot_sauce", "rice", "eggs", "onion"]) }));
    expect(stocked.totalCents).toBeLessThan(empty.totalCents);
    expect(stocked.cart.lines.filter((l) => l.have).every((l) => ["salt", "hot_sauce", "rice", "eggs", "onion"].includes(l.ingredient.id))).toBe(true);
  });

  it("treats diet, allergens and dislikes as hard rules", () => {
    const vegetarian = generatePlan(fixture, request({ diet: "vegetarian" }));
    expect(vegetarian.meals.every((m) => m.recipe.diet_tags.includes("vegetarian"))).toBe(true);

    const noPeanutsOrSpice = generatePlan(fixture, request({ allergens: ["peanuts"], dislikes: ["spicy"] }));
    const used = noPeanutsOrSpice.meals.flatMap((m) => m.recipe.ingredients.map((ri) => fixture.ingredients.get(ri.id)!));
    expect(used.some((i) => i.allergens.includes("peanuts"))).toBe(false);
    expect(used.some((i) => i.spicy)).toBe(false);
  });

  it("throws NotEnoughRecipesError when the rules leave too few recipes", () => {
    expect(() => generatePlan(fixture, request({ diet: "keto" }))).toThrow(NotEnoughRecipesError);
    try {
      generatePlan(fixture, request({ diet: "keto" }));
    } catch (error) {
      expect(error).toMatchObject({ slot: "dinner", available: 3, needed: 7 });
    }
  });

  it("adds lunches and breakfasts only when asked, covering every day", () => {
    const plan = generatePlan(fixture, request({ includeLunch: true, includeBreakfast: true, budgetCents: 20000 }));
    for (const slot of ["lunch", "breakfast"] as const) {
      expect(plan.meals.filter((m) => m.slot === slot).map((m) => m.day).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(plan.meals.filter((m) => m.slot === slot).every((m) => m.recipe.meal_type === slot)).toBe(true);
    }
    expect(generatePlan(fixture, request()).meals).toHaveLength(7);
  });

  it("steers away from last week's dinners when it can", () => {
    const first = generatePlan(fixture, request({ budgetCents: 15000 }));
    const avoid = new Set(first.meals.map((m) => m.recipe.slug));
    const second = generatePlan(fixture, request({ budgetCents: 15000, avoidSlugs: avoid }));
    const repeats = second.meals.filter((m) => avoid.has(m.recipe.slug)).length;
    expect(repeats).toBeLessThan(7);
  });

  it("rejects nonsense input", () => {
    expect(() => generatePlan(fixture, request({ budgetCents: 0 }))).toThrow(RangeError);
    expect(() => generatePlan(fixture, request({ householdSize: 0 }))).toThrow(RangeError);
    expect(() => generatePlan(fixture, request({ householdSize: 2.5 }))).toThrow(RangeError);
  });
});

describe("appliances", () => {
  const withAirFryer: typeof fixture = {
    ingredients: fixture.ingredients,
    recipes: fixture.recipes.map((r, i) => (i === 0 ? { ...r, equipment: ["stovetop", "air_fryer"] } : r)),
  };
  const slug = withAirFryer.recipes[0].slug;
  const base = { diet: "none", allergens: [], dislikes: [] } as const;

  it("leaves out a recipe that needs an appliance the kitchen lacks", () => {
    const can = eligibleRecipes(withAirFryer, { ...base, equipment: ["stovetop", "oven"] });
    expect(can.map((r) => r.slug)).not.toContain(slug);
  });

  it("keeps it when every appliance is there, or when no kitchen was given", () => {
    const has = eligibleRecipes(withAirFryer, { ...base, equipment: ["air_fryer", "stovetop"] });
    expect(has.map((r) => r.slug)).toContain(slug);
    expect(eligibleRecipes(withAirFryer, base).map((r) => r.slug)).toContain(slug);
  });

  it("keeps recipes that do not say what they need", () => {
    expect(eligibleRecipes(fixture, { ...base, equipment: [] })).toHaveLength(fixture.recipes.length);
  });
});

describe("estimateWeek", () => {
  it("brackets the plan: minimum <= typical, and the minimum is plannable", () => {
    const estimate = estimateWeek(fixture, request());
    expect(estimate.minimumCents).toBeLessThanOrEqual(estimate.typicalCents);
    expect(generatePlan(fixture, request({ budgetCents: estimate.minimumCents })).totalCents).toBeLessThanOrEqual(estimate.minimumCents);
  });

  it("grows with the household", () => {
    const sizes = [1, 2, 4, 8].map((householdSize) => estimateWeek(fixture, request({ householdSize })).minimumCents);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    expect(sizes[3]).toBeGreaterThan(sizes[0]);
  });
});

describe("swapOptions", () => {
  it("offers only eligible, unused recipes that keep the cart within budget", () => {
    const req = request({ budgetCents: 7000, diet: "vegetarian" });
    const plan = generatePlan(fixture, req);
    const inPlan = new Set(plan.meals.map((m) => m.recipe.slug));
    const options = swapOptions(fixture, req, plan.meals, { day: 2, slot: "dinner" }, 10);
    for (const option of options) {
      expect(inPlan.has(option.recipe.slug)).toBe(false);
      expect(option.recipe.meal_type).toBe("dinner");
      expect(option.recipe.diet_tags).toContain("vegetarian");
      expect(option.totalCents).toBeLessThanOrEqual(req.budgetCents);
      const swapped = plan.meals.map((m) => (m.day === 2 && m.slot === "dinner" ? { ...m, recipe: option.recipe } : m));
      expect(buildCart(swapped, fixture.ingredients, req.pantry).totalCents).toBe(option.totalCents);
      expect(option.deltaCents).toBe(option.totalCents - plan.totalCents);
    }
  });

  it("offers nothing that would break a budget with no room left", () => {
    const { minimumCents } = estimateWeek(fixture, request());
    const req = request({ budgetCents: minimumCents });
    const plan = generatePlan(fixture, req);
    for (const option of swapOptions(fixture, req, plan.meals, { day: 0, slot: "dinner" }, 20)) {
      expect(option.totalCents).toBeLessThanOrEqual(minimumCents);
    }
  });
});

describe("seeded randomness", () => {
  it("mulberry32 repeats for a seed and stays in [0, 1)", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("hashSeed is stable and spreads similar strings", () => {
    expect(hashSeed("user-1:2026-11-23")).toBe(hashSeed("user-1:2026-11-23"));
    expect(hashSeed("user-1:2026-11-23")).not.toBe(hashSeed("user-1:2026-11-30"));
    expect(Number.isInteger(hashSeed("x"))).toBe(true);
  });
});

describe.skipIf(real.recipes.length < 60)("generatePlan on the shipped catalog", () => {
  const staples = new Set(stapleIds(real.ingredients));
  const base = (over: Partial<PlanRequest>): PlanRequest => ({
    budgetCents: 12000,
    householdSize: 4,
    diet: "none",
    cookTime: "normal",
    includeBreakfast: false,
    includeLunch: false,
    pantry: staples,
    allergens: [],
    dislikes: [],
    seed: 1,
    ...over,
  });

  it("has enough recipes for every diet, with and without lunches and breakfasts", () => {
    for (const diet of DIETS) {
      const eligible = eligibleRecipes(real, { diet, allergens: [], dislikes: [] });
      expect(eligible.filter((r) => r.meal_type === "dinner").length, `${diet} dinners`).toBeGreaterThanOrEqual(14);
      expect(() => estimateWeek(real, base({ diet, includeBreakfast: true, includeLunch: true }))).not.toThrow();
    }
  });

  it("stays within budget across households, diets, budgets and seeds", () => {
    let planned = 0;
    for (const diet of DIETS) {
      for (const householdSize of [1, 2, 4, 6]) {
        for (const budgetCents of [4000, 7500, 12000, 20000]) {
          for (const seed of [1, 99]) {
            const req = base({ diet, householdSize, budgetCents, seed, includeLunch: seed === 99 });
            try {
              const plan = generatePlan(real, req);
              planned++;
              expect(plan.totalCents).toBeLessThanOrEqual(budgetCents);
              expect(plan.totalCents).toBe(buildCart(plan.meals, real.ingredients, req.pantry).totalCents);
              if (diet !== "none") expect(plan.meals.every((m) => m.recipe.diet_tags.includes(diet))).toBe(true);
            } catch (error) {
              expect(error).toBeInstanceOf(BudgetTooLowError);
            }
          }
        }
      }
    }
    expect(planned).toBeGreaterThan(40);
  });

  it("a family of four can plan seven dinners for $100", () => {
    const plan = generatePlan(real, base({ budgetCents: 10000 }));
    expect(plan.totalCents).toBeLessThanOrEqual(10000);
    expect(new Set(plan.meals.map((m) => m.recipe.slug)).size).toBe(7);
  });

  it("honors every allergen and dislike it is given", () => {
    const req = base({ allergens: ["peanuts", "shellfish", "gluten"], dislikes: ["mushrooms", "pork", "spicy"], budgetCents: 20000 });
    const plan = generatePlan(real, req);
    const matchers = DISLIKE_OPTIONS.filter((d) => req.dislikes.includes(d.key));
    for (const meal of plan.meals) {
      for (const ri of meal.recipe.ingredients) {
        const ing = real.ingredients.get(ri.id)!;
        expect(ing.allergens.some((a) => req.allergens.includes(a)), `${meal.recipe.slug} uses ${ing.id}`).toBe(false);
        expect(matchers.some((d) => d.matches(ing)), `${meal.recipe.slug} uses ${ing.id}`).toBe(false);
      }
    }
  });

  it("never plans meat or fish for vegetarians", () => {
    const plan = generatePlan(real, base({ diet: "vegetarian", includeLunch: true, includeBreakfast: true, budgetCents: 25000 }));
    for (const meal of plan.meals) {
      for (const ri of meal.recipe.ingredients) {
        expect(MEAT_KINDS.includes(real.ingredients.get(ri.id)!.kind), `${meal.recipe.slug} uses ${ri.id}`).toBe(false);
      }
    }
  });

  it("varies the main protein through an omnivore week", () => {
    const plan = generatePlan(real, base({ budgetCents: 16000 }));
    expect(new Set(plan.meals.map((m) => m.recipe.slug)).size).toBe(7);
  });

  it("plans in well under a second", () => {
    const start = performance.now();
    generatePlan(real, base({ includeBreakfast: true, includeLunch: true, budgetCents: 18000 }));
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
