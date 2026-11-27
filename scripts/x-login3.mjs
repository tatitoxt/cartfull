import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('x.com')) || await ctx.newPage();
// click country dropdown (the +1 selector)
const sel = page.locator('select').first();
if (await sel.count()) {
  await sel.selectOption({ label: /argentina/i }).catch(async () => {
    const opts = await sel.locator('option').allInnerTexts();
    console.log('options sample:', opts.slice(0, 5));
    await sel.selectOption({ value: '+54' }).catch(()=>{});
  });
} else {
  // maybe a div-based dropdown: click the +1 area
  await page.locator('text=+1').first().click().catch(()=>{});
  await page.waitForTimeout(1200);
  await page.keyboard.type('argentina');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
}
await page.waitForTimeout(800);
// fix the number field: clear and enter local format
const phoneInput = page.locator('input[type="tel"], input[inputmode="tel"], input[placeholder*="hone"]').first();
await phoneInput.click();
await phoneInput.fill('');
await phoneInput.fill('1173618816');
await page.screenshot({ path: '/tmp/x-step4.png' });
const cont = page.getByRole('button', { name: /continue|next|siguiente/i }).first();
await cont.click().catch(() => page.keyboard.press('Enter'));
await page.waitForTimeout(4500);
await page.screenshot({ path: '/tmp/x-step5.png' });
console.log('url:', page.url());
console.log((await page.locator('body').innerText()).slice(0, 400));
await browser.close();
