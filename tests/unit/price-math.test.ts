import { describe, expect, it } from "vitest";
import { proratedCents, recipeCentsPerServing } from "@/lib/catalog/cost";
import { buildCart, packagesFor, purchaseCents, soldByWeight, stapleIds } from "@/lib/planner/cart";
import type { MealAssignment } from "@/lib/planner/types";
import { fixture, get, RECIPES } from "./fixture";

const meal = (slug: string, servings = 4, day = 0): MealAssignment => ({
  day,
  slot: "dinner",
  recipe: RECIPES.find((r) => r.slug === slug)!,
  servings,
});

describe("prorated recipe cost", () => {
  it("charges only the share of the package a recipe uses", () => {
    expect(proratedCents(get("rice"), 2)).toBeCloseTo(50); // 2 of 10 cups in a $2.50 bag
    expect(proratedCents(get("chicken"), 1.5)).toBeCloseTo(450);
  });

  it("divides the recipe total by its servings, staples included", () => {
    // rice 50 + beans 180 + onion 80 + salt 1 = 311 cents over 4 servings
    expect(recipeCentsPerServing(RECIPES[0], fixture.ingredients)).toBeCloseTo(77.75);
  });

  it("fails loudly on an unknown ingredient", () => {
    const broken = { ...RECIPES[0], ingredients: [{ id: "unobtainium", qty: 1 }] };
    expect(() => recipeCentsPerServing(broken, fixture.ingredients)).toThrow(/unobtainium/);
  });
});

describe("store packages", () => {
  it("rounds packaged goods up to whole packages", () => {
    expect(packagesFor(get("rice"), 0.25)).toBe(1);
    expect(packagesFor(get("rice"), 10)).toBe(1);
    expect(packagesFor(get("rice"), 10.01)).toBe(2);
    expect(packagesFor(get("beans"), 3)).toBe(3);
    expect(packagesFor(get("eggs"), 13)).toBe(2);
  });

  it("buys nothing for a zero quantity", () => {
    expect(packagesFor(get("rice"), 0)).toBe(0);
    expect(purchaseCents(get("rice"), 0)).toBe(0);
  });

  it("is not thrown off by floating point sums", () => {
    expect(packagesFor(get("beans"), 0.1 + 0.2 + 0.7)).toBe(1);
    expect(packagesFor(get("rice"), 3.3 + 3.3 + 3.4)).toBe(1);
  });

  it("sells per-pound items by the quarter pound", () => {
    expect(soldByWeight(get("chicken"))).toBe(true);
    expect(soldByWeight(get("pasta"))).toBe(false); // a 1 lb box is a package
    expect(packagesFor(get("chicken"), 1.1)).toBe(1.25);
    expect(packagesFor(get("chicken"), 1.25)).toBe(1.25);
    expect(packagesFor(get("chicken"), 0.1)).toBe(0.25);
    expect(purchaseCents(get("chicken"), 1.1)).toBe(375);
    expect(purchaseCents(get("pasta"), 1.1)).toBe(240);
  });

  it("never prices a purchase below the prorated cost", () => {
    for (const ing of fixture.ingredients.values()) {
      for (const qty of [0.1, 0.5, 1, 1.5, 2.75, 7, 13, 40]) {
        expect(purchaseCents(ing, qty)).toBeGreaterThanOrEqual(Math.floor(proratedCents(ing, qty)));
      }
    }
  });
});

describe("grocery cart", () => {
  it("consolidates shared ingredients into one line before rounding to packages", () => {
    const cart = buildCart([meal("rice-beans"), meal("bean-chili", 4, 1)], fixture.ingredients, new Set());
    const beans = cart.lines.find((l) => l.ingredient.id === "beans")!;
    expect(beans.qty).toBe(5);
    expect(beans.packages).toBe(5);
    expect(beans.cents).toBe(450);
    expect(beans.usedIn.sort()).toEqual(["bean-chili", "rice-beans"]);
    expect(cart.lines.filter((l) => l.ingredient.id === "onion")).toHaveLength(1);
  });

  it("totals exactly the lines that still have to be bought", () => {
    const cart = buildCart([meal("rice-beans"), meal("bean-chili", 4, 1)], fixture.ingredients, new Set());
    // rice 250 + beans 450 + onion 2 x 80 + salt 100 + hot sauce 200
    expect(cart.totalCents).toBe(1160);
    expect(cart.totalCents).toBe(cart.lines.reduce((sum, l) => sum + (l.have ? 0 : l.cents), 0));
  });

  it("keeps pantry items on the list but takes them off the total", () => {
    const have = new Set(["salt", "hot_sauce", "rice"]);
    const cart = buildCart([meal("rice-beans"), meal("bean-chili", 4, 1)], fixture.ingredients, have);
    expect(cart.totalCents).toBe(610);
    const rice = cart.lines.find((l) => l.ingredient.id === "rice")!;
    expect(rice.have).toBe(true);
    expect(rice.cents).toBe(250); // price is kept so "add back" can show it
  });

  it("scales quantities to the household, not the recipe's servings", () => {
    const two = buildCart([meal("chicken-rice", 2)], fixture.ingredients, new Set());
    const six = buildCart([meal("chicken-rice", 6)], fixture.ingredients, new Set());
    expect(two.lines.find((l) => l.ingredient.id === "chicken")!.qty).toBeCloseTo(0.75);
    expect(six.lines.find((l) => l.ingredient.id === "chicken")!.qty).toBeCloseTo(2.25);
    expect(six.totalCents).toBeGreaterThan(two.totalCents);
  });

  it("returns an empty cart for no meals", () => {
    expect(buildCart([], fixture.ingredients, new Set())).toEqual({ lines: [], totalCents: 0 });
  });

  it("lists staples as the default pantry", () => {
    expect(stapleIds(fixture.ingredients).sort()).toEqual(["hot_sauce", "salt"]);
  });
});
