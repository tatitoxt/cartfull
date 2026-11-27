import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { hasAccess } from "../billing/plans";
import { catalog, recipeBySlug } from "../catalog";
import type { MealType } from "../catalog/types";
import { buildCart } from "../planner/cart";
import type { Cart, MealAssignment, PlanRequest } from "../planner/types";
import { createClient } from "../supabase/server";
import { DEFAULTS, type Profile } from "./profile";
import { weekIsOver } from "./week";

export interface Session {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
}

/** The signed-in user, or a redirect to the sign-in page. */
export async function requireSession(next = "/app/plan"): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, userId: user.id, email: user.email ?? null };
}

export async function getProfile({ supabase, userId }: Session): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data as Profile;
}

export interface Feedback {
  favorites: Set<string>;
  ratings: Map<string, number>;
}

/** Hearts and stars the household gave recipes. */
export async function getFeedback({ supabase, userId }: Session): Promise<Feedback> {
  const { data } = await supabase
    .from("recipe_feedback")
    .select("recipe_slug, favorite, rating")
    .eq("user_id", userId);
  const favorites = new Set<string>();
  const ratings = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.favorite) favorites.add(row.recipe_slug as string);
    if (typeof row.rating === "number") ratings.set(row.recipe_slug as string, row.rating);
  }
  return { favorites, ratings };
}

export interface Entitlement {
  /** True only while the billing provider says the subscription is trialing or active. */
  active: boolean;
  status: string;
  interval: string | null;
  trialEnd: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
  /** Has subscribed before, so no second free trial. */
  hadSubscription: boolean;
}

export async function getEntitlement({ supabase, userId }: Session): Promise<Entitlement> {
  const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  return {
    active: hasAccess(data?.status),
    status: data?.status ?? "none",
    interval: data?.billing_interval ?? null,
    trialEnd: data?.trial_end ?? null,
    periodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    hasCustomer: Boolean(data?.billing_customer_id),
    hadSubscription: Boolean(data?.billing_subscription_id),
  };
}

export async function getPantry({ supabase, userId }: Session): Promise<Set<string>> {
  const { data } = await supabase.from("pantry_items").select("ingredient_id").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.ingredient_id as string));
}

export interface PlanRow {
  id: string;
  week_start: string;
  budget_cents: number;
  usual_spend_cents: number | null;
  household_size: number;
  diet: string;
  total_cents: number;
  seed: number;
  spent_cents: number | null;
  created_at: string;
  /** Embedded one-to-one: PostgREST returns an object (or null) here. */
  plan_receipts?: { plan_id: string } | { plan_id: string }[] | null;
}

export interface LoadedPlan {
  row: PlanRow;
  meals: MealAssignment[];
  cart: Cart;
  checked: Set<string>;
  have: Set<string>;
  /** Saved per-ingredient stock (uncapped), including fully-owned rows. */
  haveQty: Map<string, number>;
  /** Ingredients added by hand, outside what the meals asked for. */
  extras: Set<string>;
  /** Full price of the extras that are not already cart lines. */
  extrasCents: number;
  /** The free first week, or any week while subscribed. */
  viewable: boolean;
  editable: boolean;
  isFirst: boolean;
}

export async function listPlans({ supabase, userId }: Session): Promise<PlanRow[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, week_start, budget_cents, usual_spend_cents, household_size, diet, total_cents, seed, spent_cents, created_at, plan_receipts(plan_id)")
    .eq("user_id", userId)
    .order("week_start", { ascending: false });
  if (error) throw new Error(`Could not load plans: ${error.message}`);
  return (data ?? []) as PlanRow[];
}

export function firstPlanId(plans: PlanRow[]): string | null {
  if (!plans.length) return null;
  return [...plans].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))[0].id;
}

export interface WeekRecap {
  meals: number;
  leftovers: number;
  groceries: number;
  bought: number;
  atHome: number;
}

/** Per-plan counts for the savings recap: meals, cart items and shopping progress. */
export async function weekRecaps(session: Session, planIds: string[]): Promise<Map<string, WeekRecap>> {
  const recaps = new Map<string, WeekRecap>();
  if (!planIds.length) return recaps;
  // PostgREST caps responses at 1,000 rows, so longer histories are paged.
  const page = async <T,>(run: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> => {
    const rows: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await run(from, from + 999);
      if (!data?.length) break;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return rows;
  };
  const [mealRows, itemRows] = await Promise.all([
    page((from, to) => session.supabase.from("plan_meals").select("plan_id, day, slot, recipe_slug, servings, leftover").in("plan_id", planIds).range(from, to)),
    page((from, to) => session.supabase.from("plan_items").select("plan_id, ingredient_id, checked, have, extra").in("plan_id", planIds).range(from, to)),
  ]);
  const order: MealType[] = ["breakfast", "lunch", "dinner"];
  const mealsByPlan = new Map<string, MealAssignment[]>();
  for (const id of planIds) {
    recaps.set(id, { meals: 0, leftovers: 0, groceries: 0, bought: 0, atHome: 0 });
    mealsByPlan.set(id, []);
  }
  for (const row of mealRows) {
    const recap = recaps.get(row.plan_id as string);
    const recipe = recipeBySlug(row.recipe_slug as string);
    if (!recap || !recipe) continue;
    recap.meals += 1;
    if (row.leftover) recap.leftovers += 1;
    mealsByPlan.get(row.plan_id as string)!.push({
      day: row.day as number,
      slot: row.slot as MealType,
      recipe,
      servings: row.servings as number,
      leftover: Boolean(row.leftover),
    });
  }
  const lineIdsByPlan = new Map<string, Set<string>>();
  for (const [id, meals] of mealsByPlan) {
    meals.sort((a, b) => a.day - b.day || order.indexOf(a.slot) - order.indexOf(b.slot));
    // Leftover meals need no shopping; their lines are skipped by the cart.
    const cart = buildCart(meals, catalog.ingredients, new Set(), new Map());
    recaps.get(id)!.groceries = cart.lines.length;
    lineIdsByPlan.set(id, new Set(cart.lines.map((l) => l.ingredient.id)));
  }
  // Extras are hand-added lines: they count toward the week's groceries too.
  for (const row of itemRows) {
    if (!row.extra) continue;
    const id = row.plan_id as string;
    const lineIds = lineIdsByPlan.get(id);
    if (lineIds && !lineIds.has(row.ingredient_id as string)) {
      lineIds.add(row.ingredient_id as string);
      recaps.get(id)!.groceries += 1;
    }
  }
  for (const row of itemRows) {
    const recap = recaps.get(row.plan_id as string);
    const lineIds = lineIdsByPlan.get(row.plan_id as string);
    // Rows can outlive the cart: a meal that became leftovers frees its
    // ingredients, and a fully owned item drops off the list.
    if (!recap || !lineIds?.has(row.ingredient_id as string)) continue;
    if (row.checked) recap.bought += 1;
    if (row.have) recap.atHome += 1;
  }
  return recaps;
}

export async function loadPlan(
  session: Session,
  row: PlanRow,
  access: { active: boolean; firstId: string | null },
): Promise<LoadedPlan> {
  const isFirst = row.id === access.firstId;
  const viewable = access.active || isFirst;
  const editable = access.active || (isFirst && !weekIsOver(row.week_start));
  if (!viewable) {
    return { row, meals: [], cart: { lines: [], totalCents: 0 }, checked: new Set(), have: new Set(), haveQty: new Map(), extras: new Set(), extrasCents: 0, viewable, editable, isFirst };
  }

  const [{ data: mealRows }, { data: itemRows }] = await Promise.all([
    session.supabase.from("plan_meals").select("day, slot, recipe_slug, servings, leftover").eq("plan_id", row.id),
    session.supabase.from("plan_items").select("ingredient_id, checked, have, have_qty, extra").eq("plan_id", row.id),
  ]);

  const order: MealType[] = ["breakfast", "lunch", "dinner"];
  const meals: MealAssignment[] = [];
  for (const m of mealRows ?? []) {
    const recipe = recipeBySlug(m.recipe_slug as string);
    if (recipe)
      meals.push({
        day: m.day as number,
        slot: m.slot as MealType,
        recipe,
        servings: m.servings as number,
        leftover: Boolean(m.leftover),
      });
  }
  meals.sort((a, b) => a.day - b.day || order.indexOf(a.slot) - order.indexOf(b.slot));

  const have = new Set<string>();
  const checked = new Set<string>();
  const haveQty = new Map<string, number>();
  const extras = new Set<string>();
  for (const item of itemRows ?? []) {
    if (item.have) have.add(item.ingredient_id as string);
    const owned = Number(item.have_qty ?? 0);
    if (owned > 0) haveQty.set(item.ingredient_id as string, owned);
    if (item.checked) checked.add(item.ingredient_id as string);
    if (item.extra) extras.add(item.ingredient_id as string);
  }
  const cart = buildCart(meals, catalog.ingredients, have, haveQty);
  const lineIds = new Set(cart.lines.map((l) => l.ingredient.id));
  let extrasCents = 0;
  for (const id of extras) {
    if (!lineIds.has(id)) extrasCents += catalog.ingredients.get(id)?.pkg_cents ?? 0;
  }
  return { row, meals, cart, checked, have, haveQty, extras, extrasCents, viewable, editable, isFirst };
}

/** The planner request that reproduces a household's preferences. */
export function planRequest(
  profile: Profile,
  pantry: ReadonlySet<string>,
  seed: number,
  overrides: Partial<PlanRequest> = {},
): PlanRequest {
  return {
    budgetCents: profile.weekly_budget_cents ?? DEFAULTS.weekly_budget_cents,
    householdSize: profile.household_size,
    diet: profile.diet,
    cookTime: profile.cook_time,
    includeBreakfast: profile.include_breakfast,
    includeLunch: profile.include_lunch,
    pantry,
    allergens: profile.allergens,
    dislikes: profile.dislikes,
    equipment: profile.equipment,
    seed,
    ...overrides,
  };
}
