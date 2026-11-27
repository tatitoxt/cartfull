import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('x.com')) || await ctx.newPage();
await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(4500);
const input = page.locator('input[type="text"], input:not([type])').first();
await input.click();
await input.fill(process.env.X_USERNAME);
await page.waitForTimeout(800);
const btn = page.getByRole('button', { name: /continue|next|siguiente/i }).first();
await btn.click().catch(() => page.keyboard.press('Enter'));
await page.waitForTimeout(4000);
await page.screenshot({ path: '/tmp/x-step1.png' });
// phone verification page?
const phoneInput = page.locator('input[type="tel"], input[placeholder*="hone"], input[inputmode="tel"]').first();
if (await phoneInput.count()) {
  await phoneInput.click();
  await phoneInput.fill('9173618816');
  await page.screenshot({ path: '/tmp/x-step2.png' });
  const cont = page.getByRole('button', { name: /continue|next|siguiente/i }).first();
  await cont.click().catch(() => page.keyboard.press('Enter'));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/x-step3.png' });
  console.log('phone submitted');
} else {
  console.log('no phone input; state:', await page.locator('body').innerText().then(t => t.slice(0, 300)));
}
console.log('url:', page.url());
await browser.close();
