import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "@/components/photo";
import { catalog, recipeBySlug } from "@/lib/catalog";
import { recipeCentsPerServing } from "@/lib/catalog/cost";
import { getProfile, requireSession } from "@/lib/app/data";
import { moneyExact, quantity, unitLabel } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const recipe = recipeBySlug((await params).slug);
  return { title: recipe?.name ?? "Recipe" };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = recipeBySlug(slug);
  if (!recipe) notFound();
  const session = await requireSession(`/app/recipe/${slug}`);
  const profile = await getProfile(session);
  const servings = profile.household_size;
  const scale = servings / recipe.servings;

  return (
    <article>
      <Link href="/app/plan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-green-deep">
        <span aria-hidden="true">←</span> Back to the week
      </Link>
      <h1 className="mt-2 text-4xl sm:text-5xl">{recipe.name}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{recipe.description}</p>
      <p className="tnum mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="font-semibold text-tomato-deep">
          {moneyExact(Math.round(recipeCentsPerServing(recipe, catalog.ingredients)))} a serving
        </span>
        <span className="text-ink-soft">{recipe.prep_minutes} min</span>
        <span className="text-ink-soft">Serves {servings}</span>
      </p>
      <div className="mt-6 overflow-hidden rounded-card">
        <Photo url={recipe.photo_url} alt={recipe.name} ratio={16 / 10} sizes="(min-width: 768px) 728px, 100vw" priority className="w-full" />
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Photo by{" "}
        <a href={recipe.photo_credit.url} className="underline underline-offset-2" rel="noreferrer" target="_blank">
          {recipe.photo_credit.name}
        </a>{" "}
        on Unsplash
      </p>

      <div className="mt-9 grid gap-10 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="ingredients">
          <h2 id="ingredients" className="text-2xl">
            Ingredients
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {recipe.ingredients.map((ri) => {
              const ing = catalog.ingredients.get(ri.id)!;
              const qty = ri.qty * scale;
              const unit = unitLabel(ing.unit, qty);
              return (
                <li key={ri.id} className="flex gap-3 py-2.5">
                  <span className="tnum w-20 shrink-0 font-semibold">
                    {quantity(qty)} {unit}
                  </span>
                  <span>
                    {ing.name}
                    {ri.note && <span className="text-ink-soft">, {ri.note}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="steps">
          <h2 id="steps" className="text-2xl">
            Method
          </h2>
          <ol className="mt-4 space-y-5">
            {recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="tnum font-display text-3xl font-semibold leading-none text-green" aria-hidden="true">
                  {index + 1}
                </span>
                <p className="pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
