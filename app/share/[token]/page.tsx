import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { createAdminClient } from "@/lib/supabase/server";
import { catalog, recipeBySlug } from "@/lib/catalog";
import { buildCart, soldByWeight } from "@/lib/planner/cart";
import { weekLabel } from "@/lib/app/week";
import { AISLE_LABELS } from "@/lib/catalog/aisles";
import { AISLES, type MealType } from "@/lib/catalog/types";
import type { MealAssignment } from "@/lib/planner/types";
import { amount, ingredientName, packageLabel, type Lang, type Units } from "@/lib/catalog/localize";
import { MESSAGES, fill } from "@/lib/i18n/messages";
import { SharedList, type SharedLine } from "./shared-list";

export const metadata: Metadata = { title: "Shared grocery list" };

type SharedPlan = {
  plan_id: string;
  week_start: string;
  budget_cents: number;
  lang: Lang;
  units: Units;
  items: { ingredient_id: string; checked: boolean; have: boolean; have_qty: number; extra?: boolean }[];
  meals: { day: number; slot: MealType; slug: string; servings: number; leftover?: boolean }[];
};

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const { data } = await createAdminClient().rpc("shared_plan", { p_token: token });
  const shared = data as SharedPlan | null;
  if (!shared) notFound();

  const { lang, units } = shared;
  const m = MESSAGES[lang] ?? MESSAGES.en;

  const order: MealType[] = ["breakfast", "lunch", "dinner"];
  const meals: MealAssignment[] = [];
  for (const row of shared.meals) {
    const recipe = recipeBySlug(row.slug);
    if (recipe)
      meals.push({ day: row.day, slot: row.slot, recipe, servings: row.servings, leftover: Boolean(row.leftover) });
  }
  meals.sort((a, b) => a.day - b.day || order.indexOf(a.slot) - order.indexOf(b.slot));

  const have = new Set<string>();
  const checked = new Set<string>();
  const haveQty = new Map<string, number>();
  for (const item of shared.items) {
    if (item.have) have.add(item.ingredient_id);
    if (item.have_qty > 0) haveQty.set(item.ingredient_id, item.have_qty);
    if (item.checked) checked.add(item.ingredient_id);
  }
  const cart = buildCart(meals, catalog.ingredients, have, haveQty);

  const lines: SharedLine[] = cart.lines.map((line) => {
    const ing = line.ingredient;
    // line.packages counts what is left to buy after "have at home" is prorated.
    const packages = line.packages;
    const buyLabel = packageLabel(ing.pkg_label, lang, units) ?? ing.pkg_label;
    return {
      id: ing.id,
      name: ingredientName(ing, lang),
      aisle: ing.aisle,
      need: amount(line.qty, ing.unit, lang, units),
      buy: soldByWeight(ing) ? amount(packages, "lb", lang, units) : packages > 1 ? `${packages} × ${buyLabel}` : buyLabel,
      checked: checked.has(ing.id),
      have: line.have,
    };
  });
  // Hand-added extras come through as items but are not cart lines.
  const lineIds = new Set(lines.map((l) => l.id));
  for (const item of shared.items) {
    if (!item.extra || lineIds.has(item.ingredient_id)) continue;
    const ing = catalog.ingredients.get(item.ingredient_id);
    if (!ing) continue;
    lines.push({
      id: ing.id,
      name: ingredientName(ing, lang),
      aisle: ing.aisle,
      need: "",
      buy: packageLabel(ing.pkg_label, lang, units) ?? ing.pkg_label,
      checked: item.checked,
      have: false,
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-6">
      <Logo />
      <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-accent">
        {fill(m.common.weekOf, { date: weekLabel(shared.week_start, lang) })}
      </p>
      <h1 className="mt-2 text-4xl">{m.shared.title}</h1>
      <p className="mt-2 text-fg-soft">{m.shared.lead}</p>
      <SharedList
        token={token}
        planId={shared.plan_id}
        lines={lines}
        aisles={AISLES.map((aisle) => ({ aisle, label: AISLE_LABELS[lang][aisle] }))}
      />
    </div>
  );
}
