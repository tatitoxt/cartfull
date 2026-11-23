import type { Metadata } from "next";
import Link from "next/link";
import { BudgetMeter } from "@/components/budget-meter";
import { Photo } from "@/components/photo";
import { catalog } from "@/lib/catalog";
import { recipeCentsPerServing } from "@/lib/catalog/cost";
import { loadAppState } from "@/lib/app/current";
import { getFeedback } from "@/lib/app/data";
import { FavoriteToggle } from "@/components/recipe-feedback";
import { weekIsOver, weekLabel } from "@/lib/app/week";
import { money, moneyExact } from "@/lib/format";
import type { MealAssignment } from "@/lib/planner/types";
import { MESSAGES, fill } from "@/lib/i18n/messages";
import { PlanActions } from "./plan-actions";
import { LeftoverToggle } from "./leftover-toggle";
import { SwapButton } from "./swap-button";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await loadAppState("/app/plan");
  return { title: MESSAGES[profile.lang].metadata.plan };
}

const perServing = (meal: MealAssignment) => Math.round(recipeCentsPerServing(meal.recipe, catalog.ingredients));

export default async function PlanPage() {
  const { session, current, entitlement, canPlanNext, plans, profile } = await loadAppState("/app/plan");
  const feedback = await getFeedback(session);
  const m = MESSAGES[profile.lang];
  const lang = profile.lang;

  if (!current) {
    return (
      <section className="py-10">
        <h1 className="text-4xl">{m.plan.firstTitle}</h1>
        <p className="mt-3 max-w-md text-fg-soft">{m.plan.firstLead}</p>
        <PlanActions mode="first" />
      </section>
    );
  }

  const { row, meals, cart, editable, viewable } = current;
  const over = weekIsOver(row.week_start);

  if (!viewable) {
    return (
      <section className="py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">{fill(m.common.weekOf, { date: weekLabel(row.week_start, lang) })}</p>
        <h1 className="mt-2 text-4xl">{m.plan.subscriptionEnded}</h1>
        <p className="mt-3 max-w-md text-fg-soft">
          {fill(m.plan.savedWeeks, { count: plans.length })}
        </p>
        <Link href="/app/upgrade" className="btn btn-cta mt-6">
          {m.plan.seePlans}
        </Link>
      </section>
    );
  }

  const days = m.days.full.map((name, day) => ({
    name,
    dinner: meals.find((m) => m.day === day && m.slot === "dinner"),
    others: meals.filter((m) => m.day === day && m.slot !== "dinner"),
  }));

  return (
    <>
      <section aria-labelledby="week-title">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">{fill(m.common.weekOf, { date: weekLabel(row.week_start, lang) })}</p>
        <h1 id="week-title" className="mt-1.5 text-3xl sm:text-4xl">
          {over ? m.plan.lastWeek : m.plan.thisWeek}, {m.plan.planned}
        </h1>
        <div className="mt-5">
          <BudgetMeter totalCents={cart.totalCents} budgetCents={row.budget_cents} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {editable && !over && <PlanActions mode="regenerate" planId={row.id} />}
          {entitlement.active && (canPlanNext || over) && (
            <a href="#next-week" className="btn btn-primary">
              {m.plan.planNext}
            </a>
          )}
        </div>
        {cart.totalCents > row.budget_cents && (
          <p role="status" className="mt-5 rounded-2xl bg-over-soft p-4 shadow-[inset_0_0_0_1.5px_var(--color-over)]">
            {fill(m.plan.overChanged, { amount: money(cart.totalCents - row.budget_cents, lang) })}
          </p>
        )}
      </section>

      {(canPlanNext || over) && (
        <section id="next-week" className="mt-8 rounded-card bg-accent-soft p-5" aria-label={m.plan.nextWeek}>
          {entitlement.active ? (
            <>
              <h2 className="text-2xl">{m.plan.readyNext}</h2>
              <p className="mt-1 text-fg-soft">{m.plan.nextLead}</p>
              <PlanActions mode="next" />
            </>
          ) : (
            <>
              <h2 className="text-2xl">{m.plan.freeWeek}</h2>
              <p className="mt-1 text-fg-soft">
                {entitlement.hadSubscription
                  ? m.plan.subscribeAgain
                  : m.plan.freeTrial}
              </p>
              <Link href="/app/upgrade" className="btn btn-cta mt-4" data-testid="paywall-cta">
                {entitlement.hadSubscription ? m.plan.seePlans : m.plan.startTrial}
              </Link>
            </>
          )}
        </section>
      )}

      <ol className="mt-7 space-y-6">
        {days.map(({ name, dinner, others }, day) => (
          <li key={name} data-testid="plan-day">
            <h2 className="flex items-baseline gap-3 text-xl">
              {name}
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            </h2>
            {dinner && (
              <article className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:items-center">
                <Link href={`/app/recipe/${dinner.recipe.slug}?plan=${row.id}`} className="block overflow-hidden rounded-card">
                  <Photo
                    url={dinner.recipe.photo_url}
                    alt={dinner.recipe.name_es && lang === "es" ? dinner.recipe.name_es : dinner.recipe.name}
                    ratio={day === 0 ? 3 / 2 : 2}
                    sizes="(min-width: 640px) 320px, 100vw"
                    priority={day === 0}
                    className="h-full w-full"
                  />
                </Link>
                <div>
                  <div className="flex items-start gap-1">
                    <h3 className="text-xl leading-tight">
                      <Link href={`/app/recipe/${dinner.recipe.slug}?plan=${row.id}`} className="hover:underline" data-testid="dinner-name">
                        {dinner.recipe.name_es && lang === "es" ? dinner.recipe.name_es : dinner.recipe.name}
                      </Link>
                    </h3>
                    <FavoriteToggle slug={dinner.recipe.slug} initial={feedback.favorites.has(dinner.recipe.slug)} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-fg-soft">{lang === "es" && dinner.recipe.description_es ? dinner.recipe.description_es : dinner.recipe.description}</p>
                  <p className="tnum mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-accent-deep">{fill(m.plan.perServing, { amount: moneyExact(perServing(dinner), lang) })}</span>
                    <span className="text-fg-soft">{fill(m.common.min, { count: dinner.recipe.prep_minutes })}</span>
                    <span className="text-fg-soft">{fill(m.recipe.serves, { count: dinner.servings })}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {editable && !over && (
                    <SwapButton planId={row.id} day={day} slot="dinner" currentName={dinner.recipe.name_es && lang === "es" ? dinner.recipe.name_es : dinner.recipe.name} />
                    )}
                    {editable && !over && (
                      <LeftoverToggle planId={row.id} day={day} slot="dinner" leftover={Boolean(dinner.leftover)} />
                    )}
                    {dinner.leftover && (
                      <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-deep">{m.plan.leftoversOn}</span>
                    )}
                  </div>
                </div>
              </article>
            )}
            {others.length > 0 && (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {others.map((meal) => (
                  <li key={meal.slot} className="flex items-center gap-3 py-3">
                    <Photo url={meal.recipe.photo_url} alt="" ratio={1} sizes="56px" className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-fg-faint">{m.plan.slot[meal.slot]}</p>
                      <Link href={`/app/recipe/${meal.recipe.slug}?plan=${row.id}`} className="block truncate font-semibold hover:underline">
                          {meal.recipe.name_es && lang === "es" ? meal.recipe.name_es : meal.recipe.name}
                      </Link>
                      <p className="tnum text-sm text-fg-soft">
                        {fill(m.plan.perServing, { amount: moneyExact(perServing(meal), lang) })} · {fill(m.common.min, { count: meal.recipe.prep_minutes })}
                      </p>
                    </div>
                    <FavoriteToggle slug={meal.recipe.slug} initial={feedback.favorites.has(meal.recipe.slug)} />
                    {editable && !over && (
                      <LeftoverToggle planId={row.id} day={day} slot={meal.slot} leftover={Boolean(meal.leftover)} />
                    )}
                    {editable && !over && !meal.leftover && (
                      <SwapButton planId={row.id} day={day} slot={meal.slot} currentName={meal.recipe.name_es && lang === "es" ? meal.recipe.name_es : meal.recipe.name} compact />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-fg-faint">
        {m.plan.prices}
      </p>
    </>
  );
}
