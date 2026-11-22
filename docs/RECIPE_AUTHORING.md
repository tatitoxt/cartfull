# Recipe catalog authoring

The catalog lives in `data/`:

- `data/ingredients.json` — the master ingredient list (id, unit, package size, estimated package price).
- `data/recipes/*.json` — arrays of recipes. Each file is one batch.

Run `npm run validate:catalog` (add `-- --photos` to also check every photo URL) before committing.

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
  "steps": ["Heat the oven to 425°F.", "Toss ...", "Roast 20 minutes.", "Serve in tortillas."],
  "ingredients": [
    { "id": "chicken_breast", "qty": 1.5, "note": "sliced" },
    { "id": "bell_pepper", "qty": 3 }
  ],
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
- `steps`: 3-7 short imperative sentences. `description`: one plain sentence, 140 characters max. `name`: 48 characters max, no brand names.
- `photo_url`: an Unsplash CDN URL in the form `https://images.unsplash.com/photo-<id>` with no query string. It must load, show the finished dish (or something a reader would accept as that dish), and be used by only one recipe. `photo_credit` is the photographer's name and the photo's unsplash.com page.
