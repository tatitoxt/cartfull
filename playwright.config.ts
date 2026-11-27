import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // CI provides the environment directly.
}

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build, local Supabase
 * (`npx supabase start`) and a local stand-in for Polar.
 */
const env = {
  NEXT_PUBLIC_SITE_URL: baseURL,
  POLAR_ACCESS_TOKEN: "polar_test_local",
  POLAR_WEBHOOK_SECRET: "whsec_bG9jYWxfZTJlX3NlY3JldF9rZXlfaGVyZQ==",
  POLAR_PRODUCT_MONTHLY: "product_monthly_test",
  POLAR_PRODUCT_ANNUAL: "product_annual_test",
  POLAR_API_BASE: "http://localhost:12111",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The consent banner would otherwise cover the onboarding CTAs it overlaps.
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: "cartfull:consent", value: "all" }] }],
    },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /landing\.spec\.ts/ },
  ],
  webServer: [
    { command: "node tests/e2e/fake-polar.mjs", url: "http://localhost:12111/health", env, reuseExistingServer: !process.env.CI },
    {
      command: `npm run build && npm run start -- -p ${PORT}`,
      url: baseURL,
      env,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
