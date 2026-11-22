import type { Metadata } from "next";
import Link from "next/link";
import { loadAppState } from "@/lib/app/current";
import { weekIsOver, weekLabel } from "@/lib/app/week";
import { AISLES, type Aisle } from "@/lib/catalog/types";
import { packagesFor, soldByWeight } from "@/lib/planner/cart";
import { quantity, unitLabel } from "@/lib/format";
import { GroceryList, type ListLine } from "./grocery-list";

export const metadata: Metadata = { title: "Grocery list" };

export const AISLE_LABELS: Record<Aisle, string> = {
  produce: "Produce",
  meat: "Meat",
  seafood: "Seafood",
  dairy: "Dairy and eggs",
  bakery: "Bakery",
  pantry: "Dry goods",
  canned: "Cans and jars",
  frozen: "Frozen",
  condiments: "Oils and sauces",
  spices: "Spices",
};

export default async function ListPage() {
  const { current } = await loadAppState("/app/list");
  if (!current || !current.viewable) {
    return (
      <section className="py-10">
        <h1 className="text-4xl">No list yet</h1>
        <p className="mt-3 text-ink-soft">Plan a week and the priced grocery list shows up here.</p>
        <Link href="/app/plan" className="btn btn-primary mt-6">
          Go to my plan
        </Link>
      </section>
    );
  }

  const { row, cart, checked, editable } = current;
  const lines: ListLine[] = cart.lines.map((line) => {
    const ing = line.ingredient;
    const packages = packagesFor(ing, line.qty);
    const unit = unitLabel(ing.unit, line.qty);
    return {
      id: ing.id,
      name: ing.name,
      aisle: ing.aisle,
      need: `${quantity(line.qty)}${unit ? ` ${unit}` : ""}`,
      buy: soldByWeight(ing) ? `${quantity(packages)} lb` : packages > 1 ? `${packages} × ${ing.pkg_label}` : ing.pkg_label,
      cents: line.cents,
      have: line.have,
      checked: checked.has(ing.id),
    };
  });

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wider text-green">Week of {weekLabel(row.week_start)}</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Grocery list</h1>
      <GroceryList
        planId={row.id}
        budgetCents={row.budget_cents}
        lines={lines}
        aisles={AISLES.map((aisle) => ({ aisle, label: AISLE_LABELS[aisle] }))}
        editable={editable && !weekIsOver(row.week_start)}
      />
    </>
  );
}
