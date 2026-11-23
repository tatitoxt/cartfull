# Cartfull

Tell us your weekly grocery budget. We plan the week, price the cart, and show you what you saved.

Cartfull is a budget-first weekly meal planner for US households. It is not a recipe browser: the budget comes first, and everything else follows from it.

1. **Budget** – four short questions: weekly budget, household, what to avoid, what is already in the kitchen.
2. **Plan** – seven dinners (breakfasts and lunches optional) picked so the whole cart fits the budget.
3. **List** – one consolidated grocery list by aisle, priced per whole package, with pantry items taken off.
4. **Savings** – each week compared with what the household usually spends; enter the receipt to make it exact.

The first planned week is free with no card. After that: 7-day free trial, then $9.99 a month or $49.99 a year.

> Prices are estimates based on typical US discount-grocer shelf prices. They are not live prices from any store and are not a quote. Cartfull does not provide medical, dietary or nutrition advice, and recipes are not reviewed by a nutritionist. Always check ingredient labels for allergens.

## Stack

- Next.js 15 (App Router, React 19, TypeScript strict), Tailwind CSS v4
- Supabase: Postgres, row-level security, email magic link + 6-digit code, optional Google sign-in
- Stripe Checkout, Customer Portal and webhooks
- Installable PWA: manifest, icons, service worker, offline grocery list
- Vitest unit tests, Playwright end-to-end tests
- Optional PostHog analytics

## How planning works

There is no AI in the planning path. `lib/planner` is a deterministic engine: the same household, catalog and seed always give the same week.

- Recipes are filtered hard by diet, allergens, dislikes and cooking time.
- Candidates are scored by cost, ingredient overlap (to finish packages instead of wasting them), variety and whether they were cooked last week.
- The cart is priced the way a store charges: whole packages, or quarter-pound steps for items sold by weight. Pantry items stay on the list at $0.
- A plan never exceeds the budget. If no week fits, the planner says so and reports the lowest budget that works.
- Swaps only offer meals that keep the week under budget.

The catalog lives in `data/` (176 priced ingredients, 120 recipes: 90 dinners, 15 lunches, 15 breakfasts). `docs/RECIPE_AUTHORING.md` describes the format. `npm run validate:catalog` checks it, and `npm run catalog:build` regenerates `lib/catalog/generated.ts` and `db/seed.sql`.

## Run it locally

Requirements: Node 22+, Docker (for local Supabase).

```bash
npm ci
npx supabase start          # Postgres, auth and a mail catcher on :54324
cp .env.example .env.local  # fill the Supabase keys from `npx supabase status`
npm run dev
```

Open http://localhost:3000. Sign-in emails arrive in the local mail catcher at http://127.0.0.1:54324.

`npx supabase db reset` re-applies `db/migrations` and `db/seed.sql`.

### Billing locally

With a Stripe test account, set the four `STRIPE_*` variables and forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Without one, `node tests/e2e/fake-stripe.mjs` runs a small stand-in for the Stripe API that serves a test checkout page and sends signed webhooks. Set `STRIPE_API_BASE=http://localhost:12111` and any `sk_test_…` key. The stand-in is ignored unless the secret key is a test key.

## Checks

| Command | What it does |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Unit tests: price math, planner invariants, savings, week boundaries, validation |
| `npm run validate:catalog -- --photos` | Catalog rules, plus a request to every photo URL |
| `npm run test:e2e` | Playwright against a production build, local Supabase and the Stripe stand-in |
| `npm run build` | Production build |

The end-to-end suite covers the landing page and calculator, onboarding, sign-in by emailed code, the plan, swaps, the grocery list (totals, check-off, pantry, offline), savings and receipts, the paywall, checkout with a trial, planning as a subscriber, and the Customer Portal with cancellation. It needs `npx supabase start` and `npx playwright install chromium` once.

## Environment variables

| Variable | Needed | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL, no trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Used by the Stripe webhook and checkout |
| `STRIPE_SECRET_KEY` | yes | Server only |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret of the webhook endpoint |
| `STRIPE_PRICE_MONTHLY` | yes | Price id for $9.99 / month |
| `STRIPE_PRICE_ANNUAL` | yes | Price id for $49.99 / year |
| `NEXT_PUBLIC_GOOGLE_AUTH` | no | `true` shows the Google button |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | no | Analytics are off when the key is empty |

## Deploy

1. **Supabase** – create a project, then `npx supabase link` and `npx supabase db push` to apply `db/migrations`. Run `db/seed.sql` once to load the catalog. In Auth settings set the Site URL, add `https://<domain>/auth/callback**` to the redirect list (the link carries a query string), and use `supabase/templates/magic_link.html` for the magic link and confirmation emails so they include the 6-digit code and name the account the link signs in to (links without it are refused). Configure an SMTP provider for production email. Enable Google under Auth providers if wanted.
2. **Stripe** – create one product with two recurring prices ($9.99 monthly, $49.99 yearly). Add a webhook endpoint at `https://<domain>/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.*` and `invoice.*`. Turn on the Customer Portal.
3. **Vercel** (or any Node host) – import the repository, set the variables above, deploy.

## Access rules

- Subscription state is written only by the Stripe webhook, using the service role. The browser can read it but never write it.
- Row-level security lets a household read and edit only its own data. Creating a second week, and editing after the free week ends, requires a `trialing` or `active` subscription; this is enforced in the database, not just in the UI.
- `/app/welcome` waits for the webhook instead of trusting the checkout redirect.

## Known limits

- Prices are a single national estimate. There are no store-specific prices, weekly ads or coupons.
- Dislikes and allergens are matched against ingredient data; packaged foods can still contain traces. The Terms say so.
- Spanish covers the landing page. The signed-in app is English.
- Terms and Privacy are plain-language drafts and need legal review before launch.
