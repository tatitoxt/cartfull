"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { captureServer } from "../analytics/server";
import { catalog, recipeBySlug } from "../catalog";
import { MEAL_TYPES, type MealType } from "../catalog/types";
import { buildCart } from "../planner/cart";
import { generatePlan, hashSeed, swapOptions } from "../planner/plan";
import { BudgetTooLowError, NotEnoughRecipesError, type MealAssignment } from "../planner/types";
import {
  firstPlanId,
  getEntitlement,
  getPantry,
  getProfile,
  listPlans,
  loadPlan,
  planRequest,
  requireSession,
  type Session,
} from "./data";
import { answersSchema, typicalSpendCents, type Answers } from "./profile";
import { addDays, targetWeekStart, weekIsOver } from "./week";

export type ActionResult =
  | { ok: true }
  | { ok: false; code: "budget_too_low"; minimumCents: number; message: string }
  | { ok: false; code: "not_enough_recipes" | "paywall" | "invalid" | "locked" | "failed"; message: string };

const fail = (code: Exclude<ActionResult, { ok: true }>["code"], message: string): ActionResult =>
  ({ ok: false, code, message }) as ActionResult;

function plannerFailure(error: unknown): ActionResult | null {
  if (error instanceof BudgetTooLowError) {
    return {
      ok: false,
      code: "budget_too_low",
      minimumCents: error.minimumCents,
      message: `We can't build this week for $${Math.floor(error.budgetCents / 100)}. The leanest week we can plan for your household is about $${Math.ceil(error.minimumCents / 100)}.`,
    };
  }
  if (error instanceof NotEnoughRecipesError) {
    return fail(
      "not_enough_recipes",
      `Only ${error.available} ${error.slot} recipes fit your diet, allergies and dislikes. Loosen one of them and try again.`,
    );
  }
  return null;
}

async function readUtm(): Promise<Record<string, string>> {
  try {
    const raw = (await cookies()).get("cf_utm")?.value;
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([k, v]) => k.startsWith("utm_") && typeof v === "string"),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveAnswers(session: Session, answers: Answers, markOnboarded: boolean): Promise<string | null> {
  const { supabase, userId } = session;
  const known = answers.pantry.filter((id) => catalog.ingredients.has(id));
  const update: Record<string, unknown> = {
    weekly_budget_cents: answers.weekly_budget_cents,
    usual_spend_cents: answers.usual_spend_cents ?? typicalSpendCents(answers.household_size),
    household_size: answers.household_size,
    diet: answers.diet,
    cook_time: answers.cook_time,
    include_breakfast: answers.include_breakfast,
    include_lunch: answers.include_lunch,
    allergens: answers.allergens,
    dislikes: answers.dislikes,
    country: answers.country,
    lang: answers.lang,
    units: answers.units,
    equipment: answers.equipment,
  };
  if (markOnboarded) {
    update.onboarded_at = new Date().toISOString();
    const utm = await readUtm();
    if (Object.keys(utm).length) update.utm = utm;
  }
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) return error.message;

  const { error: clearError } = await supabase.from("pantry_items").delete().eq("user_id", userId);
  if (clearError) return clearError.message;
  if (known.length) {
    const { error: pantryError } = await supabase
      .from("pantry_items")
      .insert(known.map((ingredient_id) => ({ user_id: userId, ingredient_id })));
    if (pantryError) return pantryError.message;
  }
  return null;
}

/**
 * Builds and stores a week. `planId` regenerates that week; without it a new
 * week is created (free for the very first one, subscribers only after that).
 */
async function buildWeek(session: Session, planId?: string): Promise<ActionResult> {
  const [profile, pantry, plans, entitlement] = await Promise.all([
    getProfile(session),
    getPantry(session),
    listPlans(session),
    getEntitlement(session),
  ]);
  const firstId = firstPlanId(plans);
  const existing = planId ? plans.find((p) => p.id === planId) : undefined;
  if (planId && !existing) return fail("invalid", "That week no longer exists.");

  let weekStart: string;
  let seed: number;
  const have = new Set(pantry);
  if (existing) {
    const loaded = await loadPlan(session, existing, { active: entitlement.active, firstId });
    if (!loaded.editable) return fail("paywall", "Start your free trial to keep planning.");
    weekStart = existing.week_start;
    seed = (existing.seed + 1) | 0;
    // What the shopper told us on this week's list wins over the saved pantry.
    for (const line of loaded.cart.lines) {
      if (line.have) have.add(line.ingredient.id);
      else have.delete(line.ingredient.id);
    }
  } else {
    if (plans.length > 0 && !entitlement.active) return fail("paywall", "Start your free trial to plan another week.");
    weekStart = targetWeekStart();
    while (plans.some((p) => p.week_start === weekStart)) weekStart = addDays(weekStart, 7);
    seed = hashSeed(`${session.userId}:${weekStart}`) | 0;
  }

  // Steer away from the dinners of the most recent other week.
  const previous = plans.find((p) => p.id !== existing?.id);
  let avoidSlugs: Set<string> | undefined;
  if (previous) {
    const { data } = await session.supabase.from("plan_meals").select("recipe_slug").eq("plan_id", previous.id);
    avoidSlugs = new Set((data ?? []).map((m) => m.recipe_slug as string));
  }

  const request = planRequest(profile, have, seed, { avoidSlugs });
  let plan;
  try {
    plan = generatePlan(catalog, request);
  } catch (error) {
    const failure = plannerFailure(error);
    if (failure) return failure;
    throw error;
  }

  const error = await savePlan(session, {
    weekStart,
    budgetCents: request.budgetCents,
    usualSpendCents: profile.usual_spend_cents ?? typicalSpendCents(profile.household_size),
    householdSize: profile.household_size,
    diet: profile.diet,
    seed,
    meals: plan.meals,
    have,
  });
  if (error) return error;

  await captureServer("plan_generated", session.userId, {
    budget: request.budgetCents / 100,
    total: plan.totalCents / 100,
    household_size: profile.household_size,
    diet: profile.diet,
    regenerated: Boolean(existing),
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}

async function savePlan(
  session: Session,
  input: {
    weekStart: string;
    budgetCents: number;
    usualSpendCents: number;
    householdSize: number;
    diet: string;
    seed: number;
    meals: MealAssignment[];
    have: ReadonlySet<string>;
  },
): Promise<ActionResult | null> {
  const cart = buildCart(input.meals, catalog.ingredients, input.have);
  const { error } = await session.supabase.rpc("save_plan", {
    p_week_start: input.weekStart,
    p_budget_cents: input.budgetCents,
    p_usual_spend_cents: input.usualSpendCents,
    p_household_size: input.householdSize,
    p_diet: input.diet,
    p_total_cents: cart.totalCents,
    p_seed: input.seed,
    p_meals: input.meals.map((m) => ({ day: m.day, slot: m.slot, recipe_slug: m.recipe.slug, servings: m.servings })),
    p_items: cart.lines.map((line) => ({ ingredient_id: line.ingredient.id, have: line.have })),
  });
  if (!error) return null;
  if (error.code === "42501") return fail("paywall", "Start your free trial to keep planning.");
  console.error("save_plan failed", error);
  return fail("failed", "We couldn't save your week. Try again.");
}

export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  const session = await requireSession("/start");
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", "Some answers look off. Check them and try again.");

  const profile = await getProfile(session);
  const error = await saveAnswers(session, parsed.data, true);
  if (error) return fail("failed", "We couldn't save your answers. Try again.");
  if (!profile.onboarded_at) {
    await captureServer("onboarding_completed", session.userId, {
      budget: parsed.data.weekly_budget_cents / 100,
      household_size: parsed.data.household_size,
      diet: parsed.data.diet,
      cook_time: parsed.data.cook_time,
    });
  }

  const plans = await listPlans(session);
  if (plans.length === 0) return buildWeek(session);
  // Already has a week: refresh it with the new answers when that is allowed.
  const latest = plans[0];
  const entitlement = await getEntitlement(session);
  const editable = entitlement.active || (latest.id === firstPlanId(plans) && !weekIsOver(latest.week_start));
  if (editable && !weekIsOver(latest.week_start)) return buildWeek(session, latest.id);
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function createNextWeek(): Promise<ActionResult> {
  return buildWeek(await requireSession());
}

export async function regenerateWeek(planId: string): Promise<ActionResult> {
  return buildWeek(await requireSession(), planId);
}

async function editablePlan(session: Session, planId: string) {
  const [plans, entitlement] = await Promise.all([listPlans(session), getEntitlement(session)]);
  const row = plans.find((p) => p.id === planId);
  if (!row) return null;
  const loaded = await loadPlan(session, row, { active: entitlement.active, firstId: firstPlanId(plans) });
  return loaded.editable ? loaded : null;
}

export interface SwapChoice {
  slug: string;
  name: string;
  photoUrl: string;
  prepMinutes: number;
  totalCents: number;
  deltaCents: number;
}

export async function getSwapChoices(planId: string, day: number, slot: MealType): Promise<SwapChoice[]> {
  const session = await requireSession();
  if (!MEAL_TYPES.includes(slot)) return [];
  const loaded = await editablePlan(session, planId);
  if (!loaded || !loaded.meals.some((m) => m.day === day && m.slot === slot)) return [];
  const [profile, pantry] = await Promise.all([getProfile(session), getPantry(session)]);
  const have = effectiveHave(pantry, loaded);
  const request = planRequest(profile, have, loaded.row.seed, {
    budgetCents: loaded.row.budget_cents,
    householdSize: loaded.row.household_size,
  });
  return swapOptions(catalog, request, loaded.meals, { day, slot }).map((option) => ({
    slug: option.recipe.slug,
    name: option.recipe.name,
    photoUrl: option.recipe.photo_url,
    prepMinutes: option.recipe.prep_minutes,
    totalCents: option.totalCents,
    deltaCents: option.deltaCents,
  }));
}

function effectiveHave(pantry: ReadonlySet<string>, loaded: { cart: { lines: { have: boolean; ingredient: { id: string } }[] } }) {
  const have = new Set(pantry);
  for (const line of loaded.cart.lines) {
    if (line.have) have.add(line.ingredient.id);
    else have.delete(line.ingredient.id);
  }
  return have;
}

export async function swapMeal(planId: string, day: number, slot: MealType, slug: string): Promise<ActionResult> {
  const session = await requireSession();
  const recipe = recipeBySlug(slug);
  if (!recipe || !MEAL_TYPES.includes(slot) || recipe.meal_type !== slot) return fail("invalid", "That meal isn't available.");
  const loaded = await editablePlan(session, planId);
  if (!loaded) return fail("locked", "This week can't be changed.");
  const current = loaded.meals.find((m) => m.day === day && m.slot === slot);
  if (!current) return fail("invalid", "That meal isn't on this week.");

  const [profile, pantry] = await Promise.all([getProfile(session), getPantry(session)]);
  const have = effectiveHave(pantry, loaded);
  const request = planRequest(profile, have, loaded.row.seed, {
    budgetCents: loaded.row.budget_cents,
    householdSize: loaded.row.household_size,
  });
  // Re-check on the server: the swap must be allowed for this household and keep the cart in budget.
  const allowed = swapOptions(catalog, request, loaded.meals, { day, slot }, Infinity).some((o) => o.recipe.slug === slug);
  if (!allowed) return fail("invalid", "That swap would put the week over budget.");

  const meals = loaded.meals.map((m) =>
    m.slot === slot && m.recipe.slug === current.recipe.slug ? { ...m, recipe } : m,
  );
  const error = await savePlan(session, {
    weekStart: loaded.row.week_start,
    budgetCents: loaded.row.budget_cents,
    usualSpendCents: loaded.row.usual_spend_cents ?? typicalSpendCents(loaded.row.household_size),
    householdSize: loaded.row.household_size,
    diet: loaded.row.diet,
    seed: loaded.row.seed,
    meals,
    have,
  });
  if (error) return error;
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function setItemState(
  planId: string,
  ingredientId: string,
  change: { checked?: boolean; have?: boolean },
): Promise<ActionResult> {
  const session = await requireSession();
  const ingredient = catalog.ingredients.get(ingredientId);
  const loaded = await editablePlan(session, planId);
  if (!loaded) return fail("locked", "This week can't be changed.");
  if (!ingredient || !loaded.cart.lines.some((l) => l.ingredient.id === ingredientId))
    return fail("invalid", "That item isn't on this list.");

  const update: Record<string, boolean> = {};
  if (typeof change.checked === "boolean") update.checked = change.checked;
  if (typeof change.have === "boolean") {
    update.have = change.have;
    if (change.have) update.checked = false;
  }
  if (!Object.keys(update).length) return { ok: true };

  const { supabase, userId } = session;
  const { error } = await supabase
    .from("plan_items")
    .upsert({ plan_id: planId, ingredient_id: ingredientId, ...update }, { onConflict: "plan_id,ingredient_id" });
  if (error) return fail("failed", "We couldn't save that. Try again.");

  if (typeof change.have === "boolean") {
    const have = new Set(loaded.have);
    if (change.have) have.add(ingredientId);
    else have.delete(ingredientId);
    const total = buildCart(loaded.meals, catalog.ingredients, have).totalCents;
    await supabase.from("plans").update({ total_cents: total }).eq("id", planId);
    // Long-lasting basics are remembered for future weeks.
    if (ingredient.staple) {
      if (change.have) await supabase.from("pantry_items").upsert({ user_id: userId, ingredient_id: ingredientId });
      else await supabase.from("pantry_items").delete().eq("user_id", userId).eq("ingredient_id", ingredientId);
    }
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function recordSpend(planId: string, spentCents: number | null): Promise<ActionResult> {
  const session = await requireSession();
  if (spentCents !== null && (!Number.isInteger(spentCents) || spentCents < 0 || spentCents > 500000))
    return fail("invalid", "Enter what you spent, in dollars.");
  const { error } = await session.supabase.rpc("record_spend", { p_plan_id: planId, p_spent_cents: spentCents });
  if (error) return fail("locked", "This week can't be changed.");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function saveSettings(input: unknown): Promise<ActionResult> {
  const session = await requireSession("/app/account");
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", "Some answers look off. Check them and try again.");
  const error = await saveAnswers(session, parsed.data, false);
  if (error) return fail("failed", "We couldn't save your settings. Try again.");
  revalidatePath("/app", "layout");
  return { ok: true };
}
