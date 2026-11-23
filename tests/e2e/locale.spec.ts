import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { onboard, signIn, uniqueEmail } from "./helpers";

test("Argentina onboarding switches the plan and grocery list to Spanish metric units", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/start");

  if (process.env.SAVE_I18N_SCREENSHOTS === "1") {
    await expect(page.getByTestId("estimate")).toContainText("$");
    const directory = resolve(process.env.HOME ?? ".", "design-refs/i18n");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: resolve(directory, "onboarding-country.png"), scale: "css" });
  }

  await page.getByText("Argentina", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Argentina" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Cuánto puedes gastar en el súper esta semana?");
  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Planifica mi semana" })).toBeEnabled();

  await page.getByRole("button", { name: "Planifica mi semana" }).click();
  await page.waitForURL(/\/login/);
  await signIn(page, uniqueEmail("locale-es"));
  await page.waitForURL(/\/app\/plan/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Esta semana");
  await expect(page.getByTestId("plan-day")).toHaveCount(7);

  if (process.env.SAVE_I18N_SCREENSHOTS === "1") {
    const directory = resolve(process.env.HOME ?? ".", "design-refs/i18n");
    await page.screenshot({ path: resolve(directory, "plan-spanish.png"), fullPage: true, scale: "css" });
  }

  await page.goto("/app/list");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lista del súper");
  const listText = (await page.locator("main").innerText()).toLowerCase();
  expect(listText).toMatch(/\b\d+(?:[,.]\d+)?\s+(?:g|kg)\b/);
  expect(listText).not.toContain(" lb");

  if (process.env.SAVE_I18N_SCREENSHOTS === "1") {
    const directory = resolve(process.env.HOME ?? ".", "design-refs/i18n");
    await page.screenshot({ path: resolve(directory, "list-spanish.png"), fullPage: true, scale: "css" });
  }
});

test("a household without an oven can still build a plan", async ({ page }) => {
  await onboard(page, uniqueEmail("no-oven"), { budget: 120, withoutOven: true });
  const recipes = await page.getByTestId("dinner-name").evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  );
  expect(recipes).toHaveLength(7);

  for (const href of recipes) {
    await page.goto(href);
    const equipment = page.getByText("You’ll need:", { exact: false });
    if (await equipment.count()) await expect(equipment).not.toContainText("Oven");
  }
});
