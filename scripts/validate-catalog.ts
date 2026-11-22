/**
 * Validates data/ingredients*.json and data/recipes/*.json.
 * Usage: npm run validate:catalog [-- --photos]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { recipeCentsPerServing } from "../lib/catalog/cost";
import {
  AISLES,
  ALLERGENS,
  DIET_TAGS,
  MEAL_TYPES,
  MEAT_KINDS,
  type Ingredient,
  type Recipe,
} from "../lib/catalog/types";

const root = join(__dirname, "..", "data");
const errors: string[] = [];
const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

const ingredients = new Map<string, Ingredient>();
for (const file of readdirSync(root).filter((f) => /^ingredients.*\.json$/.test(f))) {
  for (const ing of readJson<Ingredient[]>(join(root, file))) {
    const where = `${file}#${ing.id}`;
    if (!/^[a-z][a-z0-9_]*$/.test(ing.id)) err(where, "id must be snake_case");
    if (ingredients.has(ing.id)) err(where, "duplicate ingredient id");
    if (!AISLES.includes(ing.aisle)) err(where, `unknown aisle ${ing.aisle}`);
    if (!(ing.pkg_qty > 0) || !(ing.pkg_cents > 0)) err(where, "pkg_qty and pkg_cents must be > 0");
    if (!ing.name || !ing.unit || !ing.pkg_label) err(where, "name, unit and pkg_label are required");
    for (const a of ing.allergens ?? []) if (!ALLERGENS.includes(a)) err(where, `unknown allergen ${a}`);
    ingredients.set(ing.id, ing);
  }
}

const COST_RANGE: Record<string, [number, number]> = {
  dinner: [60, 550],
  lunch: [50, 400],
  breakfast: [25, 300],
};

const recipes: Recipe[] = [];
const slugs = new Map<string, string>();
const photos = new Map<string, string>();
const recipeDir = join(root, "recipes");
for (const file of readdirSync(recipeDir).filter((f) => f.endsWith(".json"))) {
  for (const r of readJson<Recipe[]>(join(recipeDir, file))) {
    const where = `${file}#${r.slug}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug ?? "")) err(where, "slug must be kebab-case");
    if (slugs.has(r.slug)) err(where, `duplicate slug (also in ${slugs.get(r.slug)})`);
    slugs.set(r.slug, file);
    if (!r.name || r.name.length > 48) err(where, "name is required, max 48 chars");
    if (!MEAL_TYPES.includes(r.meal_type)) err(where, `bad meal_type ${r.meal_type}`);
    if (!Array.isArray(r.diet_tags) || r.diet_tags.some((t) => !DIET_TAGS.includes(t)))
      err(where, `diet_tags must be a subset of ${DIET_TAGS.join(", ")}`);
    if (!Number.isInteger(r.servings) || r.servings < 1 || r.servings > 8) err(where, "servings must be 1-8");
    if (!Number.isInteger(r.prep_minutes) || r.prep_minutes < 5 || r.prep_minutes > 480)
      err(where, "prep_minutes must be 5-480");
    if (typeof r.batch_friendly !== "boolean") err(where, "batch_friendly must be boolean");
    if (!r.description || r.description.length > 140) err(where, "description is required, max 140 chars");
    if (!Array.isArray(r.steps) || r.steps.length < 3 || r.steps.length > 7) err(where, "3-7 steps required");
    if (!Array.isArray(r.ingredients) || r.ingredients.length < 2 || r.ingredients.length > 15) {
      err(where, "2-15 ingredients required");
      continue;
    }
    const seen = new Set<string>();
    let known = true;
    for (const ri of r.ingredients) {
      const ing = ingredients.get(ri.id);
      if (!ing) {
        err(where, `unknown ingredient id "${ri.id}"`);
        known = false;
        continue;
      }
      if (seen.has(ri.id)) err(where, `ingredient ${ri.id} listed twice`);
      seen.add(ri.id);
      if (!(ri.qty > 0)) err(where, `qty for ${ri.id} must be > 0`);
      if (r.diet_tags?.includes("vegetarian") && MEAT_KINDS.includes(ing.kind))
        err(where, `tagged vegetarian but uses ${ri.id}`);
    }
    if (known) {
      const cents = recipeCentsPerServing(r, ingredients);
      const [lo, hi] = COST_RANGE[r.meal_type] ?? [0, Infinity];
      if (cents < lo || cents > hi)
        err(where, `cost/serving $${(cents / 100).toFixed(2)} outside $${lo / 100}-$${hi / 100} for ${r.meal_type}`);
    }
    if (!/^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9_-]+$/.test(r.photo_url ?? ""))
      err(where, "photo_url must be https://images.unsplash.com/photo-<id> with no query string");
    else if (photos.has(r.photo_url)) err(where, `photo already used by ${photos.get(r.photo_url)}`);
    else photos.set(r.photo_url, r.slug);
    if (!r.photo_credit?.name || !/^https:\/\/unsplash\.com\//.test(r.photo_credit?.url ?? ""))
      err(where, "photo_credit {name, url on unsplash.com} required");
    recipes.push(r);
  }
}

async function checkPhotos() {
  const queue = [...photos.entries()];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let item = queue.pop(); item; item = queue.pop()) {
        const [url, slug] = item;
        try {
          const res = await fetch(`${url}?w=64&q=40&fm=jpg`, { method: "GET" });
          if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/"))
            err(slug, `photo not reachable (${res.status})`);
        } catch (e) {
          err(slug, `photo fetch failed: ${(e as Error).message}`);
        }
      }
    }),
  );
}

async function main() {
  if (process.argv.includes("--photos")) await checkPhotos();
  const by = (f: (r: Recipe) => boolean) => recipes.filter(f).length;
  console.log(`${ingredients.size} ingredients, ${recipes.length} recipes`);
  for (const m of MEAL_TYPES) {
    const tags = DIET_TAGS.map((t) => `${t}=${by((r) => r.meal_type === m && r.diet_tags.includes(t))}`);
    console.log(`  ${m}: ${by((r) => r.meal_type === m)} (${tags.join(", ")})`);
  }
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Catalog OK");
}
void main();
