import { expect, test } from "@playwright/test";
import { cents } from "./helpers";

test.describe("landing page", () => {
  test("states the promise and leads to onboarding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("hero-cta")).toHaveAttribute("href", "/start");
    await expect(page.getByTestId("sample-dinner")).toHaveCount(7);
    await expect(page.getByTestId("sample-total")).toContainText("$");
  });

  test("the savings calculator reacts to household and spend", async ({ page }) => {
    await page.goto("/");
    const monthly = page.getByTestId("calc-monthly");
    const planned = page.getByTestId("calc-planned");
    const before = cents(await monthly.textContent());
    const plannedBefore = cents(await planned.textContent());

    await page.locator("#calc-spend").fill("300");
    await expect(page.getByTestId("calc-spend")).toHaveText("$300");
    await expect.poll(async () => cents(await monthly.textContent())).toBeGreaterThan(before);

    const people = Number(await page.getByTestId("calc-people").textContent());
    await page.getByRole("button", { name: /more/i }).first().click();
    await expect(page.getByTestId("calc-people")).toHaveText(String(people + 1));
    await expect.poll(async () => cents(await planned.textContent())).toBeGreaterThan(plannedBefore);

    const href = await page.getByTestId("calc-cta").getAttribute("href");
    expect(href).toContain(`people=${people + 1}`);
    expect(href).toContain("spend=300");
    await page.getByTestId("calc-cta").click();
    await expect(page).toHaveURL(/\/start\?/);
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("pricing shows both plans and the trial", async ({ page }) => {
    await page.goto("/#pricing");
    await expect(page.getByTestId("price")).toHaveText("$49.99");
    await page.getByTestId("interval-monthly").click();
    await expect(page.getByTestId("price")).toHaveText("$9.99");
    await expect(page.locator("#pricing")).toContainText(/7 days free, then \$9\.99 a month/i);
  });

  test("answers questions and discloses estimates", async ({ page }) => {
    await page.goto("/");
    const first = page.locator("#faq details").first();
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expect(page.getByRole("contentinfo")).toContainText(/estimate/i);
    await expect(page.getByRole("contentinfo")).toContainText(/does not provide medical, dietary or nutrition advice/i);
  });

  test("is available in Spanish", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByTestId("hero-cta")).toBeVisible();
  });

  test("ships a web app manifest, legal pages and crawl files", async ({ page, request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.name).toContain("Cartfull");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);
    for (const path of ["/sw.js", "/robots.txt", "/sitemap.xml", "/offline"]) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
