import type { Metadata } from "next";
import Link from "next/link";
import { BudgetMeter } from "@/components/budget-meter";
import { Photo } from "@/components/photo";
import { catalog } from "@/lib/catalog";
import { recipeCentsPerServing } from "@/lib/catalog/cost";
import { loadAppState } from "@/lib/app/current";
import { weekIsOver, weekLabel } from "@/lib/app/week";
import { DAY_NAMES, money, moneyExact } from "@/lib/format";
import type { MealAssignment } from "@/lib/planner/types";
import { PlanActions } from "./plan-actions";
import { SwapButton } from "./swap-button";

export const metadata: Metadata = { title: "This week" };

const perServing = (meal: MealAssignment) => Math.round(recipeCentsPerServing(meal.recipe, catalog.ingredients));

export default async function PlanPage() {
  const { current, entitlement, canPlanNext, plans } = await loadAppState("/app/plan");

  if (!current) {
    return (
      <section className="py-10">
        <h1 className="text-4xl">Let&apos;s plan your first week</h1>
        <p className="mt-3 max-w-md text-ink-soft">Your answers are saved. One tap builds seven dinners priced to your budget.</p>
        <PlanActions mode="first" />
      </section>
    );
  }

  const { row, meals, cart, editable, viewable } = current;
  const over = weekIsOver(row.week_start);

  if (!viewable) {
    return (
      <section className="py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-green">Week of {weekLabel(row.week_start)}</p>
        <h1 className="mt-2 text-4xl">Your subscription has ended</h1>
        <p className="mt-3 max-w-md text-ink-soft">
          Your {plans.length} planned weeks are saved. Subscribe again to open them and plan the next one.
        </p>
        <Link href="/app/upgrade" className="btn btn-cta mt-6">
          See plans
        </Link>
      </section>
    );
  }

  const days = DAY_NAMES.map((name, day) => ({
    name,
    dinner: meals.find((m) => m.day === day && m.slot === "dinner"),
    others: meals.filter((m) => m.day === day && m.slot !== "dinner"),
  }));

  return (
    <>
      <section aria-labelledby="week-title">
        <p className="text-sm font-semibold uppercase tracking-wider text-green">Week of {weekLabel(row.week_start)}</p>
        <h1 id="week-title" className="mt-2 text-4xl sm:text-5xl">
          {over ? "Last week" : "This week"}, planned
        </h1>
        <div className="mt-7">
          <BudgetMeter totalCents={cart.totalCents} budgetCents={row.budget_cents} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app/list" className="btn btn-primary">
            Open grocery list
          </Link>
          {editable && !over && <PlanActions mode="regenerate" planId={row.id} />}
        </div>
        {cart.totalCents > row.budget_cents && (
          <p role="status" className="mt-5 rounded-2xl bg-yellow-soft p-4 shadow-[inset_0_0_0_1.5px_var(--color-yellow)]">
            The cart is {money(cart.totalCents - row.budget_cents)} over since you changed what you have at home. Tap
            &ldquo;New mix&rdquo; to bring it back under budget.
          </p>
        )}
      </section>

      {(canPlanNext || over) && (
        <section className="mt-8 rounded-card bg-mint-soft p-5" aria-label="Next week">
          {entitlement.active ? (
            <>
              <h2 className="text-2xl">Ready for next week?</h2>
              <p className="mt-1 text-ink-soft">Same budget, new dinners, and this week&apos;s leftovers stay off the cart.</p>
              <PlanActions mode="next" />
            </>
          ) : (
            <>
              <h2 className="text-2xl">This was your free week</h2>
              <p className="mt-1 text-ink-soft">
                {entitlement.hadSubscription
                  ? "Subscribe again to plan next week."
                  : "Try Cartfull free for 7 days to plan next week. Cancel any time."}
              </p>
              <Link href="/app/upgrade" className="btn btn-cta mt-4" data-testid="paywall-cta">
                {entitlement.hadSubscription ? "See plans" : "Start my free trial"}
              </Link>
            </>
          )}
        </section>
      )}

      <ol className="mt-10 space-y-10">
        {days.map(({ name, dinner, others }, day) => (
          <li key={name} data-testid="plan-day">
            <h2 className="flex items-baseline gap-3 text-2xl">
              {name}
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            </h2>
            {dinner && (
              <article className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:items-center">
                <Link href={`/app/recipe/${dinner.recipe.slug}?plan=${row.id}`} className="block overflow-hidden rounded-card">
                  <Photo
                    url={dinner.recipe.photo_url}
                    alt={dinner.recipe.name}
                    ratio={day === 0 ? 4 / 3 : 3 / 2}
                    sizes="(min-width: 640px) 320px, 100vw"
                    priority={day === 0}
                    className="h-full w-full"
                  />
                </Link>
                <div>
                  <h3 className="text-[1.6rem] leading-tight">
                    <Link href={`/app/recipe/${dinner.recipe.slug}?plan=${row.id}`} className="hover:underline" data-testid="dinner-name">
                      {dinner.recipe.name}
                    </Link>
                  </h3>
                  <p className="mt-2 text-ink-soft">{dinner.recipe.description}</p>
                  <p className="tnum mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-tomato-deep">{moneyExact(perServing(dinner))} a serving</span>
                    <span className="text-ink-soft">{dinner.recipe.prep_minutes} min</span>
                    <span className="text-ink-soft">Serves {dinner.servings}</span>
                  </p>
                  {editable && !over && (
                    <SwapButton planId={row.id} day={day} slot="dinner" currentName={dinner.recipe.name} />
                  )}
                </div>
              </article>
            )}
            {others.length > 0 && (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {others.map((meal) => (
                  <li key={meal.slot} className="flex items-center gap-3 py-3">
                    <Photo url={meal.recipe.photo_url} alt="" ratio={1} sizes="56px" className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{meal.slot}</p>
                      <Link href={`/app/recipe/${meal.recipe.slug}?plan=${row.id}`} className="block truncate font-semibold hover:underline">
                        {meal.recipe.name}
                      </Link>
                      <p className="tnum text-sm text-ink-soft">
                        {moneyExact(perServing(meal))} a serving · {meal.recipe.prep_minutes} min
                      </p>
                    </div>
                    {editable && !over && (
                      <SwapButton planId={row.id} day={day} slot={meal.slot} currentName={meal.recipe.name} compact />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-ink-faint">
        Prices are estimates based on typical US discount-grocer shelf prices. Your receipt will differ by store and week.
      </p>
    </>
  );
}
