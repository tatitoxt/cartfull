import { expect, test } from "@playwright/test";
import { ageWeeks, onboard, uniqueEmail } from "./helpers";

test.describe("access rules", () => {
  test("the app asks signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/app/list");
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("the sign-in page removes pages a previous person left on the device", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await page.evaluate(async () => {
      const cache = await caches.open("cartfull-pages-v1");
      await cache.put("/app/list", new Response("someone else's list", { headers: { "content-type": "text/html" } }));
    });
    await page.goto("/login");
    await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/app/list")))).toBe(false);
  });

  test("billing endpoints refuse anonymous and unsigned requests", async ({ request }) => {
    const checkout = await request.post("/api/polar/checkout", { form: { interval: "annual" }, maxRedirects: 0 });
    expect(checkout.status()).toBe(303);
    expect(checkout.headers().location).toContain("/login");

    const portal = await request.post("/api/polar/portal", { maxRedirects: 0 });
    expect(portal.headers().location).toContain("/login");

    const unsigned = await request.post("/api/polar/webhook", { data: { type: "subscription.updated" } });
    expect(unsigned.status()).toBe(403);
    const forged = await request.post("/api/polar/webhook", {
      data: { type: "subscription.updated" },
      headers: { "webhook-id": "evt_1", "webhook-timestamp": "1", "webhook-signature": "v1,deadbeef" },
    });
    expect(forged.status()).toBe(403);
  });

  test("a budget below the cheapest week is refused with the amount that works", async ({ page }) => {
    await page.goto("/start?people=6&budget=30");
    for (let step = 0; step < 4; step++) await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByTestId("estimate")).toContainText("$");
    await expect(page.getByRole("button", { name: "Plan my week" })).toBeDisabled();
    await page.getByTestId("estimate").getByRole("button").click();
    await expect(page.getByRole("button", { name: "Plan my week" })).toBeEnabled();
  });

  test("the free week cannot be extended without paying", async ({ page }) => {
    const email = uniqueEmail("free");
    await onboard(page, email, { budget: 120 });
    await expect(page.getByTestId("plan-regenerate")).toBeVisible();

    // Two weeks back, so the free week is over whatever day the test runs on.
    await ageWeeks(email, 2);
    await page.goto("/app/plan");
    await expect(page.getByTestId("paywall-cta")).toBeVisible();
    await expect(page.getByTestId("plan-next")).toHaveCount(0);
    await expect(page.getByTestId("plan-regenerate")).toHaveCount(0);
    await expect(page.getByTestId("swap-button")).toHaveCount(0);

    await page.goto("/app/account");
    await expect(page.getByTestId("account-upgrade")).toBeVisible();
    await expect(page.getByTestId("portal-button")).toHaveCount(0);
  });

  test("leaving checkout returns to the plans without a subscription", async ({ page }) => {
    const email = uniqueEmail("cancel");
    await onboard(page, email, { budget: 120 });
    await page.goto("/app/upgrade");
    await page.getByTestId("checkout-button").click();
    await expect(page.getByTestId("checkout-summary")).toContainText("product_annual_test");
    await page.getByTestId("fake-cancel").click();
    await expect(page).toHaveURL(/\/app\/upgrade\?canceled=1/);
    await expect(page.getByTestId("checkout-button")).toBeVisible();
  });
});
