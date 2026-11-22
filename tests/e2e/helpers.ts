import { expect, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

export const cents = (text: string | null) => Math.round(Number((text ?? "").replace(/[^0-9.]/g, "")) * 100);

/** Reads the six-digit sign-in code from the local mail catcher. */
export async function signInCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then((r) => r.json());
    const message = search.messages?.[0];
    if (message) {
      const full = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`).then((r) => r.json());
      const code = String(full.Text ?? full.HTML ?? "").match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No sign-in email arrived for ${email}`);
}

/** Completes the email sign-in form with the emailed code. */
export async function signIn(page: Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /email me a sign-in link/i }).click();
  await page.getByLabel(/code/i).fill(await signInCode(email));
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

/** Answers onboarding with defaults, signs up, and lands on the first plan. */
export async function onboard(page: Page, email: string, options: { budget?: number; people?: number } = {}) {
  const query = new URLSearchParams();
  if (options.budget) query.set("budget", String(options.budget));
  if (options.people) query.set("people", String(options.people));
  await page.goto(`/start?${query}`);
  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Plan my week" }).click();
  await page.waitForURL(/\/login/);
  await signIn(page, email);
  await page.waitForURL(/\/app\/plan/, { timeout: 30_000 });
  await expect(page.getByTestId("plan-day")).toHaveCount(7);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

/** Calls the local database's admin API. Only used to move test data through time. */
async function admin(path: string, init: RequestInit = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is needed for the end-to-end tests");
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=representation", ...init.headers },
  });
  if (!response.ok) throw new Error(`${path} -> ${response.status} ${await response.text()}`);
  return response.json();
}

/** Moves a shopper's plans back in time so their free first week is over. */
export async function ageWeeks(email: string, weeks = 1) {
  const profiles = await admin(`/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`);
  const userId = profiles[0]?.id;
  if (!userId) throw new Error(`No profile for ${email}`);
  const plans: { id: string; week_start: string }[] = await admin(`/rest/v1/plans?select=id,week_start&user_id=eq.${userId}`);
  for (const plan of plans) {
    const start = new Date(Date.parse(`${plan.week_start}T00:00:00Z`) - weeks * 7 * 86_400_000).toISOString().slice(0, 10);
    await admin(`/rest/v1/plans?id=eq.${plan.id}`, { method: "PATCH", body: JSON.stringify({ week_start: start }) });
  }
}
