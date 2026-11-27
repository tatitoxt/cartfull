import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0] || await browser.newContext();
const page = await ctx.newPage();
await page.goto('https://vercel.com/domains/search?q=cartfull', { waitUntil: 'domcontentloaded', timeout: 40000 });
await page.waitForTimeout(7000);
const txt = await page.locator('body').innerText();
console.log(txt.slice(0, 3500));
await browser.close();
