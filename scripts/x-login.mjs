import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0] || await browser.newContext();
const page = await ctx.newPage();
await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(4500);
const input = page.locator('input[type="text"], input:not([type])').first();
await input.click();
await input.fill(process.env.X_USERNAME);
await page.screenshot({ path: '/tmp/x-login-2.png' });
await page.waitForTimeout(800);
// click Continue / Next button
const btn = page.getByRole('button', { name: /continue|next|siguiente/i }).first();
await btn.click().catch(() => page.keyboard.press('Enter'));
await page.waitForTimeout(4000);
await page.screenshot({ path: '/tmp/x-login-3.png' });
// possible extra verification (unusual activity asks username/phone)
const verify = page.locator('input[data-testid="ocfEnterTextTextInput"]');
if (await verify.count()) {
  await verify.fill(process.env.X_USERNAME);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '/tmp/x-login-4.png' });
}
const pass = page.locator('input[type="password"]');
if (await pass.count()) {
  await pass.first().fill(process.env.X_PASSWORD);
  await page.waitForTimeout(500);
  const loginBtn = page.getByRole('button', { name: /log in|sign in|iniciar/i }).first();
  await loginBtn.click().catch(() => page.keyboard.press('Enter'));
  await page.waitForTimeout(6000);
}
await page.screenshot({ path: '/tmp/x-login-5.png' });
console.log('url now:', page.url());
console.log('has password field:', await pass.count());
await browser.close();
