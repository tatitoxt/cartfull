import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "@/components/photo";
import { catalog, recipeBySlug } from "@/lib/catalog";
import { recipeCentsPerServing } from "@/lib/catalog/cost";
import { getFeedback, getProfile, requireSession } from "@/lib/app/data";
import { RecipeFeedback } from "@/components/recipe-feedback";
import { nutritionPerServing } from "@/lib/catalog/nutrition";
import { fill } from "@/lib/i18n/messages";
import { amount, ingredientName, ingredientNote, recipeText } from "@/lib/catalog/localize";
import { moneyExact } from "@/lib/format";
import { MESSAGES } from "@/lib/i18n/messages";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const recipe = recipeBySlug((await params).slug);
  const session = await requireSession(`/app/recipe/${(await params).slug}`);
  const profile = await getProfile(session);
  return { title: (recipe && profile.lang === "es" && recipe.name_es) || recipe?.name || MESSAGES[profile.lang].metadata.recipe };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = recipeBySlug(slug);
  if (!recipe) notFound();
  const session = await requireSession(`/app/recipe/${slug}`);
  const [profile, feedback] = await Promise.all([getProfile(session), getFeedback(session)]);
  const servings = profile.household_size;
  const scale = servings / recipe.servings;
  const m = MESSAGES[profile.lang];
  const text = recipeText(recipe, profile.lang, profile.units);

  return (
    <article>
      <Link href="/app/plan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-deep">
        <span aria-hidden="true">←</span> {m.recipe.back}
      </Link>
      <h1 className="mt-2 text-4xl sm:text-5xl">{text.name}</h1>
      <p className="mt-3 max-w-xl text-fg-soft">{text.description}</p>
      <ul className="tnum mt-4 flex flex-wrap gap-2 text-sm">
        <li className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent-deep">
          {m.recipe.serving.replace("{amount}", moneyExact(Math.round(recipeCentsPerServing(recipe, catalog.ingredients)), profile.lang))}
        </li>
        <li className="rounded-full bg-budget-soft px-3 py-1 font-semibold text-budget">{m.common.min.replace("{count}", String(recipe.prep_minutes))}</li>
        <li className="rounded-full bg-spend-soft px-3 py-1 font-semibold text-spend">{m.recipe.serves.replace("{count}", String(servings))}</li>
        {recipe.active_minutes !== undefined && (
          <li className="rounded-full bg-surface px-3 py-1 font-semibold text-fg-soft shadow-[inset_0_0_0_1.5px_var(--color-line)]">{m.recipe.active.replace("{count}", String(recipe.active_minutes))}</li>
        )}
      </ul>
      {(() => {
        const nutrition = nutritionPerServing(recipe);
        return nutrition ? (
          <div className="mt-3">
            <ul className="tnum flex flex-wrap gap-2 text-sm" aria-label={m.recipe.nutritionLabel}>
              <li className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent-deep">{fill(m.recipe.nutritionKcal, { kcal: nutrition.kcal })}</li>
              <li className="rounded-full bg-budget-soft px-3 py-1 font-semibold text-budget">{fill(m.recipe.nutritionProtein, { protein: nutrition.protein })}</li>
              <li className="rounded-full bg-spend-soft px-3 py-1 font-semibold text-spend">{fill(m.recipe.nutritionCarbs, { carbs: nutrition.carbs })}</li>
              <li className="rounded-full bg-over-soft px-3 py-1 font-semibold text-over">{fill(m.recipe.nutritionFat, { fat: nutrition.fat })}</li>
            </ul>
            <p className="mt-1.5 text-xs text-fg-faint">{m.recipe.nutritionNote}</p>
          </div>
        ) : null;
      })()}
      <RecipeFeedback slug={slug} initialFavorite={feedback.favorites.has(slug)} initialRating={feedback.ratings.get(slug) ?? null} />
      {recipe.equipment && recipe.equipment.length > 0 && (
        <p className="mt-3 text-sm text-fg-soft">
          {m.recipe.equipment}: {recipe.equipment.map((item) => m.preferences.equipment[item]).join(", ")}
        </p>
      )}
      <div className="mt-6 overflow-hidden rounded-card">
        <Photo url={recipe.photo_url} alt={text.name} ratio={16 / 10} sizes="(min-width: 768px) 728px, 100vw" priority className="w-full" />
      </div>
      <p className="mt-2 text-xs text-fg-faint">
        {m.recipe.photoBy}{" "}
        <a href={recipe.photo_credit.url} className="underline underline-offset-2" rel="noreferrer" target="_blank">
          {recipe.photo_credit.name}
        </a>{" "}
        {m.recipe.onUnsplash}
      </p>

      <div className="mt-9 grid gap-10 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="ingredients">
          <h2 id="ingredients" className="text-2xl">
            {m.recipe.ingredients}
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {recipe.ingredients.map((ri) => {
              const ing = catalog.ingredients.get(ri.id)!;
              const qty = ri.qty * scale;
              return (
                <li key={ri.id} className="flex gap-3 py-2.5">
                  <span className="tnum w-20 shrink-0 font-semibold">
                    {amount(qty, ing.unit, profile.lang, profile.units)}
                  </span>
                  <span>
                    {ingredientName(ing, profile.lang)}
                    {ingredientNote(ri, profile.lang) && <span className="text-fg-soft">, {ingredientNote(ri, profile.lang)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="steps">
          <h2 id="steps" className="text-2xl">
            {m.recipe.method}
          </h2>
          <ol className="mt-4 space-y-5">
            {text.steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="tnum font-display text-3xl font-semibold leading-none text-accent" aria-hidden="true">
                  {index + 1}
                </span>
                <p className="pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {text.tip && <p className="mt-8 rounded-card bg-accent-soft p-5">{text.tip}</p>}
    </article>
  );
}
