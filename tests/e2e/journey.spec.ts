import { expect, test, type Cookie } from "@playwright/test";
import { ageWeeks, cents, onboard, setSubscriptionStatus, uniqueEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("budget to plan to list to savings to subscription", () => {
  const email = uniqueEmail("journey");
  const BUDGET = 110;

  let saved: Cookie[] = [];

  test.beforeEach(async ({ page }) => {
    // Each test restores the session saved by the first one.
    await page.context().addCookies(saved);
  });

  test("onboarding builds a week that fits the budget", async ({ page }) => {
    await onboard(page, email, { budget: BUDGET, people: 4 });
    saved = await page.context().cookies();

    const total = cents(await page.getByTestId("cart-total").textContent());
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(BUDGET * 100);
    await expect(page.getByTestId("budget")).toHaveText(`$${BUDGET}`);
    await expect(page.getByTestId("dinner-name")).toHaveCount(7);
  });

  test("a swap changes the dinner and keeps the week under budget", async ({ page }) => {
    await page.goto("/app/plan");
    const firstDay = page.getByTestId("plan-day").first();
    const before = await firstDay.getByTestId("dinner-name").textContent();
    await firstDay.getByTestId("swap-button").first().click();
    await page.getByTestId("swap-choice").first().click();
    await expect(firstDay.getByTestId("dinner-name")).not.toHaveText(before ?? "");
    expect(cents(await page.getByTestId("cart-total").textContent())).toBeLessThanOrEqual(BUDGET * 100);
  });

  test("the grocery list matches the plan total and deducts what is at home", async ({ page }) => {
    await page.goto("/app/plan");
    const planTotal = cents(await page.getByTestId("cart-total").textContent());

    await page.goto("/app/list");
    const total = page.getByTestId("cart-total");
    expect(cents(await total.textContent())).toBe(planTotal);
    expect(await page.getByTestId("aisle").count()).toBeGreaterThan(2);

    // The line prices add up to the total shown.
    const prices = await page.getByTestId("item-price").allTextContents();
    expect(prices.reduce((sum, price) => sum + cents(price), 0)).toBe(planTotal);

    // Checking an item off keeps the total; "have it" takes its price off.
    const item = page.getByTestId("list-item").first();
    await item.getByRole("checkbox").check();
    await expect(page.getByTestId("in-cart-count")).toHaveText("1");
    expect(cents(await total.textContent())).toBe(planTotal);

    const second = page.getByTestId("list-item").nth(1);
    const price = cents(await second.getByTestId("item-price").textContent());
    const name = (await second.innerText()).split("\n")[0];
    const target = page.getByTestId("list-item").filter({ hasText: name });
    // "+" adds what you have at home one unit at a time; keep tapping until the line is fully owned.
    for (let i = 0; i < 30 && (await target.isVisible().catch(() => false)); i++) {
      await target.getByTestId("have-button").click();
    }
    await expect(page.getByTestId("have-item").first()).toBeVisible();
    await expect.poll(async () => cents(await total.textContent())).toBe(planTotal - price);

    // Both changes survive a reload.
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.getByTestId("in-cart-count")).toHaveText("1");
    expect(cents(await page.getByTestId("cart-total").textContent())).toBe(planTotal - price);
  });

  test("the grocery list opens and takes check-offs without a connection", async ({ page, context }) => {
    // Reaching the list by tapping through the app, with no page load, still saves it.
    await page.goto("/app/plan");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.getByRole("link", { name: "List" }).click();
    await expect(page.getByTestId("list-item").first()).toBeVisible();
    await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/app/list")))).toBe(true);
    // A check-off made with a connection is in the saved copy too, not only the page as first opened.
    await expect(page.getByTestId("in-cart-count")).toHaveText("1");
    await page.getByTestId("list-item").nth(2).getByRole("checkbox").check();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const saved = await caches.match("/app/list");
          return /data-testid="in-cart-count"[^>]*>(<!-- -->)?2/.test((await saved?.text()) ?? "");
        }),
      )
      .toBe(true);
    await page.waitForLoadState("networkidle");
    const total = await page.getByTestId("cart-total").textContent();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId("list-item").first()).toBeVisible();
    await expect(page.getByTestId("cart-total")).toHaveText(total ?? "");
    await expect(page.getByTestId("in-cart-count")).toHaveText("2");
    await page.getByTestId("list-item").nth(3).getByRole("checkbox").check();
    await expect(page.getByTestId("in-cart-count")).toHaveText("3");

    // Back online, the queued change reaches the account.
    await context.setOffline(false);
    await expect(page.getByRole("status").filter({ hasText: /offline/i })).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.getByTestId("in-cart-count")).toHaveText("3");
  });

  test("savings compare the week with the usual spend and accept a receipt", async ({ page }) => {
    await page.goto("/app/savings");
    await expect(page.getByTestId("savings-week")).toHaveCount(1);
    const estimated = cents(await page.getByTestId("total-saved").textContent());
    expect(estimated).toBeGreaterThan(0);

    const week = page.getByTestId("savings-week").first();
    await week.getByRole("textbox").fill("80");
    await week.getByRole("button", { name: /save/i }).click();
    await expect(week.getByRole("status")).toBeVisible();
    await expect.poll(async () => cents(await page.getByTestId("total-saved").textContent())).not.toBe(estimated);
  });

  test("the second week needs a subscription, and checkout starts a trial", async ({ page }) => {
    await ageWeeks(email);
    await page.goto("/app/plan");
    await expect(page.getByTestId("plan-next")).toHaveCount(0);
    await page.getByTestId("paywall-cta").click();
    await expect(page).toHaveURL(/\/app\/upgrade/);

    await expect(page.getByTestId("price")).toHaveText("$49.99");
    await page.getByTestId("interval-monthly").click();
    await expect(page.getByTestId("price")).toHaveText("$9.99");
    await page.getByTestId("checkout-button").click();

    // Hosted checkout (the local stand-in for Polar).
    await expect(page.getByTestId("checkout-summary")).toContainText("7-day free trial");
    await expect(page.getByTestId("checkout-summary")).toContainText("product_monthly_test");
    await page.getByTestId("fake-pay").click();

    await expect(page).toHaveURL(/\/app\/welcome/);
    await expect(page.getByTestId("welcome-active")).toBeVisible({ timeout: 20_000 });
  });

  test("a subscriber can plan the next week", async ({ page }) => {
    await page.goto("/app/plan");
    // Wait for the new week to be saved. What the screen shows next depends on the weekday:
    // on a weekend the week in progress stays up, so the heading alone proves nothing.
    const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/app/plan"));
    await page.getByTestId("plan-next").click();
    expect((await saved).ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("This week", { timeout: 20_000 });
    await expect(page.getByTestId("plan-day")).toHaveCount(7);
    expect(cents(await page.getByTestId("cart-total").textContent())).toBeLessThanOrEqual(BUDGET * 100);

    await page.goto("/app/savings");
    await expect(page.getByTestId("savings-week")).toHaveCount(2);
  });

  test("a failed renewal leads to the billing portal, not to a second subscription", async ({ page }) => {
    await setSubscriptionStatus(email, "past_due");
    const checkout = await page.request.post("/api/polar/checkout", { form: { interval: "annual" }, maxRedirects: 0 });
    expect(checkout.status()).toBe(303);
    expect(checkout.headers().location).toContain("/portal");
    await setSubscriptionStatus(email, "trialing");
  });

  test("the customer portal is reachable and a cancellation removes access", async ({ page }) => {
    await page.goto("/app/account");
    await expect(page.getByTestId("billing-status")).toContainText(/trial/i);
    await page.getByTestId("portal-button").click();
    await expect(page.getByTestId("portal-status")).toHaveText("Subscription: trialing");
    await page.getByTestId("fake-portal-cancel").click();

    await expect(page).toHaveURL(/\/app\/account/);
    await expect(page.getByTestId("account-upgrade")).toBeVisible();
    await expect(page.getByTestId("billing-status")).not.toContainText(/trial/i);
  });
});
