# Recipe catalog authoring

The catalog lives in `data/`:

- `data/ingredients.json` — the master ingredient list (id, unit, package size, estimated package price).
- `data/recipes/*.json` — arrays of recipes. Each file is one batch.

Run `npm run validate:catalog -- --strict` (add `--photos` to also check every photo URL) before committing. `--strict` requires the Spanish text, equipment and timing fields described below on every ingredient and recipe.

## Recipe shape

```json
{
  "slug": "sheet-pan-chicken-fajitas",
  "name": "Sheet-Pan Chicken Fajitas",
  "meal_type": "dinner",
  "diet_tags": ["high_protein"],
  "servings": 4,
  "prep_minutes": 30,
  "batch_friendly": false,
  "description": "Chicken, peppers and onions roasted on one pan, wrapped in warm tortillas.",
  "steps": [
    "Heat the oven to {425F} and line a large sheet pan with foil.",
    "Slice the chicken into thin strips and the peppers and onion into strips of the same width.",
    "Toss everything on the pan with the oil, chili powder, cumin, salt and pepper until evenly coated.",
    "Spread into one layer and roast 18 to 20 minutes, stirring once, until the chicken is cooked through and the edges char.",
    "Warm the tortillas in the oven for the last 2 minutes, then fill and serve."
  ],
  "ingredients": [
    { "id": "chicken_breast", "qty": 1.5, "note": "sliced", "note_es": "en tiras" },
    { "id": "bell_pepper", "qty": 3 }
  ],
  "name_es": "Fajitas de pollo al horno",
  "description_es": "Pollo, pimientos y cebolla asados en una sola bandeja y servidos en tortillas tibias.",
  "steps_es": [
    "Precalienta el horno a {425F} y forra una bandeja grande con papel aluminio.",
    "Corta el pollo en tiras finas y los pimientos y la cebolla en tiras del mismo ancho.",
    "Mezcla todo en la bandeja con el aceite, el chile en polvo, el comino, sal y pimienta hasta cubrir de manera uniforme.",
    "Distribuye en una sola capa y hornea de 18 a 20 minutos, revolviendo una vez, hasta que el pollo esté cocido y los bordes dorados.",
    "Calienta las tortillas en el horno los últimos 2 minutos, rellena y sirve."
  ],
  "equipment": ["oven"],
  "active_minutes": 10,
  "tip": "Leftovers keep 3 days in the fridge and reheat well in a skillet.",
  "tip_es": "Lo que sobra dura 3 días en el refrigerador y se recalienta bien en sartén.",
  "photo_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47",
  "photo_credit": { "name": "Photographer Name", "url": "https://unsplash.com/photos/..." }
}
```

## Rules

- `qty` is always in the ingredient's own `unit` from `data/ingredients.json` (e.g. `chicken_breast` is in `lb`, `garlic` in `clove`, `rice_white` in dry `cup`). Quantities are for the recipe's `servings`.
- Only use ingredient ids that exist. If a dish truly needs something missing, add it to `data/ingredients.<batch>.json` with the same shape (keep additions rare) and price it like a US discount grocer (Aldi/Walmart level).
- `meal_type`: `dinner`, `lunch` or `breakfast`. Dinners serve 4.
- `prep_minutes` is total time to the table. Fast is 25 or less, normal 26-45, anything longer should be `batch_friendly`.
- `batch_friendly`: true when it doubles well and keeps as leftovers (soups, chili, casseroles, slow cooker, sheet-pan meal prep).
- `diet_tags` (any subset):
  - `vegetarian` — no meat, poultry, fish or shellfish (eggs and dairy are fine, broth must be vegetable).
  - `keto` — about 15 g net carbs per serving or less: no rice, pasta, bread, tortillas, potatoes, beans, sugar or honey.
  - `high_protein` — about 30 g protein per serving or more (25 g for breakfast).
- Budget cooking: dinners should cost roughly $1.25-$4.00 per serving prorated; the validator rejects anything outside $0.60-$5.50 (lunch $0.50-$4.00, breakfast $0.25-$3.00).
- Reuse ingredients across recipes (half a cabbage here, the other half there) so a week of meals shares a cart.
- `steps`: 4-10 imperative sentences a beginner can follow without guessing. Each step says what to do, for how long, at what heat (low, medium, medium-high, high) and how to tell it is done ("until golden", "until a knife slides in"). Do not repeat ingredient amounts in the steps; the ingredient list shows them in the reader's units.
- Temperatures (oven, air fryer, oil, safe internal temperature) are written as `{425F}` in both languages, always in Fahrenheit. The app shows 425°F or 220°C. Never write "425°F", "220 °C", "degrees" or "grados" as plain text. Every recipe that lists `oven` must give the oven temperature (or say to broil).
- `steps_es`: the same steps, same order and count, in Spanish. Use neutral Latin American Spanish with the informal "tú" imperative used in the example (precalienta, corta, mezcla, sirve), never "vos" (precalentá) or "usted". Prefer the words understood in most countries: "papa", "jugo", "refrigerador", "pimiento", "frijoles", "bandeja", "sartén"; avoid words tied to one country ("heladera", "morrón", "poroto", "patata", "zumo").
- `name_es` (60 characters max), `description_es` (170 max): natural Spanish, not word-for-word. Keep a dish's established name ("mac and cheese", "chili") when a translation would sound odd.
- `equipment`: every appliance the recipe cannot be made without, from `stovetop`, `oven`, `microwave`, `air_fryer`, `slow_cooker`, `pressure_cooker`, `blender`, `grill`, `toaster`. Use `[]` for no-cook recipes. Pots, pans, knives and bowls are assumed. The planner skips a recipe when the household lacks any appliance on the list, so do not list optional ones.
- `active_minutes`: hands-on time (chopping, stirring, assembling), from 3 up to `prep_minutes`.
- `tip` / `tip_es` (optional, together or not at all, 160 characters max): one practical line about storing, reheating, stretching leftovers or a cheap swap.
- `note` / `note_es` on an ingredient go together.
- `description`: one plain sentence, 140 characters max. `name`: 48 characters max, no brand names.
- `photo_url`: an Unsplash CDN URL in the form `https://images.unsplash.com/photo-<id>` with no query string. It must load, show the finished dish (or something a reader would accept as that dish), and be used by only one recipe. `photo_credit` is the photographer's name and the photo's unsplash.com page.

## Ingredients

- `name_es` is required: the everyday Latin American Spanish name, capitalised like `name` ("Pechuga de pollo", "Frijoles negros").
- `pkg_label` must be in one of these forms so it can be shown in grams or millilitres: `<number> oz <container>` or `<number> lb <container>` (container is one of bag, ball, block, bottle, box, bunch, can, canister, carton, jar, pack, packet, roll, rope, tin, tub), `<number> pack`, `<number> slices`, `about <number> lb`, or exactly one of `each`, `jar`, `1 bunch`, `1 head`, `1 loaf`, `1 dozen`, `1 small root`, `1 pint`, `half gallon`, `per lb`, `per lb, frozen`.
