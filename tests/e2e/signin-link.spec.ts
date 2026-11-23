import { expect, test, type BrowserContext } from "@playwright/test";
import { requestSignIn, signInLink, uniqueEmail } from "./helpers";

const signedIn = async (context: BrowserContext) =>
  (await context.cookies()).some((cookie) => cookie.name.includes("auth-token"));

test.describe("emailed sign-in link", () => {
  test("signs in the browser that asked for it", async ({ page }) => {
    // Punctuation that means something in a link must survive the trip through the email.
    const email = uniqueEmail("a&b#c+d");
    await page.goto("/login?next=/app/account");
    await requestSignIn(page, email);
    await page.goto(await signInLink(email));
    // A new account has no answers yet, so it lands on the first question, signed in.
    await expect(page).toHaveURL(/\/start/);
    expect(await signedIn(page.context())).toBe(true);
  });

  test("asks which account it is before signing in another browser", async ({ page, browser }) => {
    const email = uniqueEmail("link");
    await page.goto("/login?next=/app/account");
    await requestSignIn(page, email);

    const other = await browser.newContext();
    const visitor = await other.newPage();
    await visitor.goto(await signInLink(email));
    await expect(visitor).toHaveURL(/\/auth\/confirm$/);
    await expect(visitor.getByTestId("confirm-email")).toHaveText(email);
    // Nothing is signed in until the person says the address is theirs.
    expect(await signedIn(other)).toBe(false);
    await visitor.getByRole("button", { name: "Yes, sign me in" }).click();
    await expect(visitor).toHaveURL(/\/start/);
    expect(await signedIn(other)).toBe(true);
    await other.close();
  });

  test("a confirmation screen only signs in the address it shows", async ({ page, browser }) => {
    const shown = uniqueEmail("shown");
    const later = uniqueEmail("later");
    await page.goto("/login");
    await requestSignIn(page, shown);
    const first = await signInLink(shown);
    await page.getByRole("button", { name: "Use a different email" }).click();
    await requestSignIn(page, later);
    const second = await signInLink(later);

    const other = await browser.newContext();
    const tab = await other.newPage();
    await tab.goto(first);
    await expect(tab.getByTestId("confirm-email")).toHaveText(shown);
    // A second link opens in the same browser while the first screen is still up.
    const background = await other.newPage();
    await background.goto(second);
    await expect(background.getByTestId("confirm-email")).toHaveText(later);

    await tab.getByRole("button", { name: "Yes, sign me in" }).click();
    await expect(tab).toHaveURL(/\/login\?error=link/);
    expect(await signedIn(other)).toBe(false);
    await other.close();
  });

  test("refuses a link that claims to be for a different address", async ({ page, browser }) => {
    const sender = uniqueEmail("sender");
    const target = uniqueEmail("target");
    await page.goto("/login");
    await requestSignIn(page, sender);
    const forged = new URL(await signInLink(sender));
    forged.searchParams.set("email", target);

    const other = await browser.newContext();
    const visitor = await other.newPage();
    await visitor.goto("/login");
    await requestSignIn(visitor, target);
    // The target asked for their own link, then opens the one the sender made.
    await visitor.goto(forged.href);
    await expect(visitor).toHaveURL(/\/login\?error=link/);
    expect(await signedIn(other)).toBe(false);
    await visitor.goto("/app/account");
    await expect(visitor).toHaveURL(/\/login\?next=/);
    await other.close();
  });
});
