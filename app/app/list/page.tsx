import type { Metadata } from "next";
import Link from "next/link";
import { loadAppState } from "@/lib/app/current";
import { weekIsOver, weekLabel } from "@/lib/app/week";
import { AISLE_LABELS } from "@/lib/catalog/aisles";
import { AISLES } from "@/lib/catalog/types";
import { packagesFor, soldByWeight } from "@/lib/planner/cart";
import { amount, ingredientName, packageLabel } from "@/lib/catalog/localize";
import { MESSAGES, fill } from "@/lib/i18n/messages";
import { GroceryList, type ListLine } from "./grocery-list";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await loadAppState("/app/list");
  return { title: MESSAGES[profile.lang].metadata.list };
}

export default async function ListPage() {
  const { current, profile } = await loadAppState("/app/list");
  const lang = profile.lang;
  const units = profile.units;
  const m = MESSAGES[lang];
  if (!current || !current.viewable) {
    return (
      <section className="py-10">
        <h1 className="text-4xl">{m.list.noList}</h1>
        <p className="mt-3 text-ink-soft">{m.list.noListLead}</p>
        <Link href="/app/plan" className="btn btn-primary mt-6">
          {m.common.goPlan}
        </Link>
      </section>
    );
  }

  const { row, cart, checked, editable } = current;
  const lines: ListLine[] = cart.lines.map((line) => {
    const ing = line.ingredient;
    const packages = packagesFor(ing, line.qty);
    const buyLabel = packageLabel(ing.pkg_label, lang, units) ?? ing.pkg_label;
    return {
      id: ing.id,
      name: ingredientName(ing, lang),
      aisle: ing.aisle,
      need: amount(line.qty, ing.unit, lang, units),
      buy: soldByWeight(ing) ? amount(packages, "lb", lang, units) : packages > 1 ? `${packages} × ${buyLabel}` : buyLabel,
      cents: line.cents,
      have: line.have,
      checked: checked.has(ing.id),
    };
  });

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wider text-green">{fill(m.common.weekOf, { date: weekLabel(row.week_start, lang) })}</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">{m.list.title}</h1>
      <GroceryList
        planId={row.id}
        budgetCents={row.budget_cents}
        lines={lines}
        aisles={AISLES.map((aisle) => ({ aisle, label: AISLE_LABELS[lang][aisle] }))}
        editable={editable && !weekIsOver(row.week_start)}
        lang={lang}
      />
    </>
  );
}
