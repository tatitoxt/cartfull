import { proratedCents } from "../catalog/cost";
import { MEAT_KINDS, type Catalog, type Ingredient, type MealType, type Recipe } from "../catalog/types";
import { buildCart, purchaseCents } from "./cart";
import { DISLIKE_OPTIONS } from "./dislikes";
import {
  BudgetTooLowError,
  NotEnoughRecipesError,
  type CookTime,
  type MealAssignment,
  type Plan,
  type PlanRequest,
} from "./types";

/** One recipe cooked for one or more days of the week. */
interface Group {
  slot: MealType;
  days: number[];
}

/**
 * What a comfortable serving costs in cents. Cost is scored against this, not
 * against the budget, so a generous budget is left in the shopper's pocket
 * instead of being spent on pricier meals.
 */
const SERVING_REFERENCE_CENTS: Record<MealType, number> = { dinner: 275, lunch: 175, breakfast: 110 };
/** How hard cost pulls against preference on each attempt; the last attempt is cost only. */
const COST_WEIGHTS = [0.6, 1.2, 2.5, 5, 12, Infinity];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildGroups(req: PlanRequest): Group[] {
  const groups: Group[] = [];
  for (let day = 0; day < 7; day++) groups.push({ slot: "dinner", days: [day] });
  // Lunches and breakfasts repeat through the week, the way people actually eat them.
  if (req.includeLunch) for (const days of [[0, 1, 2], [3, 4], [5, 6]]) groups.push({ slot: "lunch", days });
  if (req.includeBreakfast) for (const days of [[0, 2, 4], [1, 3], [5, 6]]) groups.push({ slot: "breakfast", days });
  return groups;
}

/** Recipes this household can eat and cook at all: diet, allergens, dislikes and appliances are hard rules. */
export function eligibleRecipes(
  catalog: Catalog,
  req: Pick<PlanRequest, "diet" | "allergens" | "dislikes" | "equipment">,
): Recipe[] {
  const dislikeMatchers = DISLIKE_OPTIONS.filter((d) => req.dislikes.includes(d.key)).map((d) => d.matches);
  return catalog.recipes.filter((recipe) => {
    if (req.diet !== "none" && !recipe.diet_tags.includes(req.diet)) return false;
    if (req.equipment && recipe.equipment?.some((e) => !req.equipment!.includes(e))) return false;
    for (const ri of recipe.ingredients) {
      const ing = catalog.ingredients.get(ri.id);
      if (!ing) return false;
      if (ing.allergens.some((a) => req.allergens.includes(a))) return false;
      if (dislikeMatchers.some((m) => m(ing))) return false;
    }
    return true;
  });
}

export function timeFit(recipe: Recipe, cookTime: CookTime): number {
  const m = recipe.prep_minutes;
  if (cookTime === "fast") return m <= 25 ? 1 : m <= 35 ? 0.55 : m <= 45 ? 0.25 : 0;
  if (cookTime === "batch") return recipe.batch_friendly ? 1 : m <= 45 ? 0.5 : 0.2;
  return m <= 45 ? 1 : m <= 60 ? 0.6 : recipe.batch_friendly ? 0.4 : 0.2;
}

/** The protein a dinner is built around, used to keep the week varied. */
export function mainProtein(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>): string {
  let best = "plant";
  let bestCents = 0;
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.id);
    if (!ing || !MEAT_KINDS.includes(ing.kind) || ing.staple || /_broth$/.test(ing.id)) continue;
    const cents = proratedCents(ing, ri.qty);
    if (cents > bestCents) {
      bestCents = cents;
      best = ing.kind;
    }
  }
  return best;
}

class Week {
  readonly choice: (Recipe | null)[];
  private qty = new Map<string, number>();

  constructor(
    readonly groups: Group[],
    private ingredients: ReadonlyMap<string, Ingredient>,
    private have: ReadonlySet<string>,
    private household: number,
    private owned: ReadonlyMap<string, number> = new Map(),
  ) {
    this.choice = groups.map(() => null);
  }

  /** Cart cost of needing `qty` units of `id` after owned stock; pantry ids are free. */
  private costFor(id: string, qty: number): number {
    const owned = this.owned.get(id);
    if (owned !== undefined) return purchaseCents(this.ingredients.get(id)!, Math.max(qty - owned, 0));
    if (this.have.has(id)) return 0;
    return purchaseCents(this.ingredients.get(id)!, qty);
  }

  private scale(group: Group, recipe: Recipe): number {
    return (group.days.length * this.household) / recipe.servings;
  }

  /** Extra cart cost of cooking `recipe` for `group`, given what is already in the cart. */
  marginalCents(group: Group, recipe: Recipe): number {
    const scale = this.scale(group, recipe);
    let cents = 0;
    for (const ri of recipe.ingredients) {
      const current = this.qty.get(ri.id) ?? 0;
      cents += this.costFor(ri.id, current + ri.qty * scale) - this.costFor(ri.id, current);
    }
    return cents;
  }

  private apply(group: Group, recipe: Recipe, sign: 1 | -1) {
    const scale = this.scale(group, recipe);
    for (const ri of recipe.ingredients) {
      const next = (this.qty.get(ri.id) ?? 0) + sign * ri.qty * scale;
      if (next < 1e-9) this.qty.delete(ri.id);
      else this.qty.set(ri.id, next);
    }
  }

  set(index: number, recipe: Recipe | null) {
    const previous = this.choice[index];
    if (previous) this.apply(this.groups[index], previous, -1);
    if (recipe) this.apply(this.groups[index], recipe, 1);
    this.choice[index] = recipe;
  }

  totalCents(): number {
    let cents = 0;
    for (const [id, qty] of this.qty) cents += this.costFor(id, qty);
    return cents;
  }

  usedInSlot(slot: MealType, exceptIndex = -1): Set<string> {
    const used = new Set<string>();
    this.groups.forEach((g, i) => {
      const r = this.choice[i];
      if (g.slot === slot && i !== exceptIndex && r) used.add(r.slug);
    });
    return used;
  }

  meals(): MealAssignment[] {
    const meals: MealAssignment[] = [];
    this.groups.forEach((group, i) => {
      const recipe = this.choice[i];
      if (!recipe) return;
      for (const day of group.days) meals.push({ day, slot: group.slot, recipe, servings: this.household });
    });
    const order: MealType[] = ["breakfast", "lunch", "dinner"];
    return meals.sort((a, b) => a.day - b.day || order.indexOf(a.slot) - order.indexOf(b.slot));
  }
}

interface Context {
  catalog: Catalog;
  req: PlanRequest;
  bySlot: Record<MealType, Recipe[]>;
  jitter: Map<string, number>;
  protein: Map<string, string>;
  targetCents: (group: Group) => number;
}

function makeContext(catalog: Catalog, req: PlanRequest, groups: Group[]): Context {
  const eligible = eligibleRecipes(catalog, req);
  const bySlot: Record<MealType, Recipe[]> = { dinner: [], lunch: [], breakfast: [] };
  for (const r of eligible) bySlot[r.meal_type].push(r);
  for (const slot of ["dinner", "lunch", "breakfast"] as const) {
    bySlot[slot].sort((a, b) => a.slug.localeCompare(b.slug));
    const needed = groups.filter((g) => g.slot === slot).length;
    if (bySlot[slot].length < needed) throw new NotEnoughRecipesError(slot, bySlot[slot].length, needed);
  }
  const random = mulberry32(req.seed);
  const jitter = new Map<string, number>();
  const protein = new Map<string, string>();
  for (const r of [...bySlot.dinner, ...bySlot.lunch, ...bySlot.breakfast]) {
    jitter.set(r.slug, random() * 0.45);
    protein.set(r.slug, mainProtein(r, catalog.ingredients));
  }
  const reference = (group: Group) => SERVING_REFERENCE_CENTS[group.slot] * group.days.length * req.householdSize;
  const referenceTotal = groups.reduce((sum, g) => sum + reference(g), 0);
  const squeeze = Math.min(1, req.budgetCents / referenceTotal);
  const targetCents = (group: Group) => Math.max(1, reference(group) * squeeze);
  return { catalog, req, bySlot, jitter, protein, targetCents };
}

/** What the household already told us: favorites get a lift, ratings tilt up or down. */
export function likeBoost(req: PlanRequest, slug: string): number {
  let boost = req.favoriteSlugs?.has(slug) ? 0.6 : 0;
  const rating = req.ratings?.get(slug);
  if (rating) boost += (rating - 3) * 0.25;
  return boost;
}

/** How much the household should like this recipe in this spot, before cost. */
function preference(ctx: Context, week: Week, index: number, recipe: Recipe): number {
  let score = timeFit(recipe, ctx.req.cookTime) + (ctx.jitter.get(recipe.slug) ?? 0) + likeBoost(ctx.req, recipe.slug);
  if (ctx.req.avoidSlugs?.has(recipe.slug)) score -= 0.6;
  if (week.groups[index].slot === "dinner") {
    const kind = ctx.protein.get(recipe.slug);
    let same = 0;
    week.groups.forEach((g, i) => {
      const other = week.choice[i];
      if (i !== index && g.slot === "dinner" && other && ctx.protein.get(other.slug) === kind) same++;
    });
    if (same >= 2) score -= 0.35 * (same - 1);
  }
  return score;
}

function construct(ctx: Context, week: Week, costWeight: number) {
  week.groups.forEach((group, index) => {
    const used = week.usedInSlot(group.slot, index);
    let best: Recipe | null = null;
    let bestScore = -Infinity;
    for (const recipe of ctx.bySlot[group.slot]) {
      if (used.has(recipe.slug)) continue;
      const cost = week.marginalCents(group, recipe) / ctx.targetCents(group);
      const score = costWeight === Infinity ? -cost : preference(ctx, week, index, recipe) - costWeight * cost;
      if (score > bestScore) {
        bestScore = score;
        best = recipe;
      }
    }
    week.set(index, best);
  });
}

/** Swaps single meals for cheaper ones until the cart fits, or nothing cheaper is left. */
function reduceToBudget(ctx: Context, week: Week, budgetCents: number): number {
  let total = week.totalCents();
  while (total > budgetCents) {
    let bestIndex = -1;
    let bestRecipe: Recipe | null = null;
    let bestTotal = total;
    week.groups.forEach((group, index) => {
      const current = week.choice[index];
      const used = week.usedInSlot(group.slot, index);
      week.set(index, null);
      const base = week.totalCents();
      for (const recipe of ctx.bySlot[group.slot]) {
        if (used.has(recipe.slug) || recipe === current) continue;
        const candidateTotal = base + week.marginalCents(group, recipe);
        if (candidateTotal < bestTotal) {
          bestTotal = candidateTotal;
          bestIndex = index;
          bestRecipe = recipe;
        }
      }
      week.set(index, current);
    });
    if (bestIndex < 0 || !bestRecipe) break;
    week.set(bestIndex, bestRecipe);
    total = week.totalCents();
  }
  return total;
}

function toPlan(catalog: Catalog, week: Week, req: PlanRequest): Plan {
  const meals = week.meals();
  const cart = buildCart(meals, catalog.ingredients, req.pantry, req.owned);
  return { meals, cart, totalCents: cart.totalCents };
}

/**
 * Builds a week of meals whose priced cart is at or under the budget.
 * Deterministic for a given catalog and request. Throws BudgetTooLowError when
 * no week fits; it never returns a plan that is over budget.
 */
export function generatePlan(catalog: Catalog, req: PlanRequest): Plan {
  if (!(req.budgetCents > 0)) throw new RangeError("budgetCents must be positive");
  if (!Number.isInteger(req.householdSize) || req.householdSize < 1 || req.householdSize > 8)
    throw new RangeError("householdSize must be an integer from 1 to 8");

  const groups = buildGroups(req);
  const ctx = makeContext(catalog, req, groups);
  let cheapest = Infinity;
  for (const costWeight of COST_WEIGHTS) {
    const week = new Week(groups, catalog.ingredients, req.pantry, req.householdSize, req.owned);
    construct(ctx, week, costWeight);
    const total = reduceToBudget(ctx, week, req.budgetCents);
    cheapest = Math.min(cheapest, total);
    if (total <= req.budgetCents) {
      const plan = toPlan(catalog, week, req);
      if (plan.totalCents > req.budgetCents) throw new Error("Planner invariant broken: cart exceeds budget");
      return plan;
    }
  }
  throw new BudgetTooLowError(req.budgetCents, cheapest);
}

export interface WeekEstimate {
  /** Cheapest week the planner can build. */
  minimumCents: number;
  /** A comfortable week picked on preference with a light eye on cost. */
  typicalCents: number;
}

/** What a week costs for this household before any budget is applied. */
export function estimateWeek(catalog: Catalog, req: Omit<PlanRequest, "budgetCents">): WeekEstimate {
  const full: PlanRequest = { ...req, budgetCents: 1 };
  const groups = buildGroups(full);
  const ctx = makeContext(catalog, { ...full, budgetCents: Number.MAX_SAFE_INTEGER }, groups);

  const cheap = new Week(groups, catalog.ingredients, req.pantry, req.householdSize);
  construct(ctx, cheap, Infinity);
  const minimumCents = reduceToBudget(ctx, cheap, 0);

  const typical = new Week(groups, catalog.ingredients, req.pantry, req.householdSize);
  construct(ctx, typical, COST_WEIGHTS[0]);
  return { minimumCents, typicalCents: Math.max(minimumCents, typical.totalCents()) };
}

export interface SwapOption {
  recipe: Recipe;
  /** New cart total if this meal replaces the current one. */
  totalCents: number;
  /** Change against the current cart total; negative saves money. */
  deltaCents: number;
}

/**
 * Alternatives for one meal that keep the whole cart at or under the budget,
 * best match first.
 */
export function swapOptions(
  catalog: Catalog,
  req: PlanRequest,
  meals: readonly MealAssignment[],
  target: { day: number; slot: MealType },
  limit = 6,
): SwapOption[] {
  const current = meals.find((m) => m.day === target.day && m.slot === target.slot);
  if (!current) throw new Error("No meal in that slot");
  // Lunches and breakfasts repeat across days; a swap replaces every repeat.
  const replaced = (m: MealAssignment) => m.slot === target.slot && m.recipe.slug === current.recipe.slug;
  const others = meals.filter((m) => !replaced(m));
  const repeats = meals.filter(replaced);
  const currentTotal = buildCart(meals, catalog.ingredients, req.pantry, req.owned).totalCents;
  const taken = new Set(meals.filter((m) => m.slot === target.slot).map((m) => m.recipe.slug));
  const random = mulberry32(req.seed ^ hashSeed(`${target.day}:${target.slot}`));

  const options: (SwapOption & { score: number })[] = [];
  for (const recipe of eligibleRecipes(catalog, req)) {
    if (recipe.meal_type !== target.slot || taken.has(recipe.slug)) continue;
    const candidates = repeats.map((m) => ({ ...m, recipe, leftover: false }));
    const totalCents = buildCart([...others, ...candidates], catalog.ingredients, req.pantry, req.owned).totalCents;
    if (totalCents > req.budgetCents) continue;
    const score =
      timeFit(recipe, req.cookTime) + likeBoost(req, recipe.slug) + random() * 0.3 - (0.8 * (totalCents - currentTotal)) / Math.max(1, req.budgetCents / 7);
    options.push({ recipe, totalCents, deltaCents: totalCents - currentTotal, score });
  }
  options.sort((a, b) => b.score - a.score || a.recipe.slug.localeCompare(b.recipe.slug));
  return options.slice(0, limit).map(({ recipe, totalCents, deltaCents }) => ({ recipe, totalCents, deltaCents }));
}
