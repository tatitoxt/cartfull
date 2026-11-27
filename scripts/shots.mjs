import { chromium } from 'playwright';
const BASE = 'http://localhost:3100';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0] || await browser.newContext();
const page = await ctx.newPage();

await ctx.clearCookies();
await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
await page.waitForSelector('input[type=email]', { timeout: 10000 });
await page.fill('input[type=email]', 'tester@cartfull.dev');
await page.click('button[type=submit]');
await page.waitForTimeout(2500);
const list = await (await fetch('http://localhost:54324/api/v1/messages?limit=1')).json();
const id = list.messages?.[0]?.ID;
const detail = await (await fetch(`http://localhost:54324/api/v1/message/${id}`)).json();
const body = detail.Text || detail.HTML || '';
const m = body.match(/https?:\/\/[^\s"'<>]*auth\/callback[^\s"'<>]*/);
console.log('link found:', !!m);
if (m) { await page.goto(m[0].replace(/&amp;/g,'&'), { waitUntil: 'networkidle' }); await page.waitForTimeout(2000); }
console.log('after login:', page.url());

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: /got it|essential only/i }).first().click().catch(()=>{});
await page.waitForTimeout(500);
const shots = [
  ['/app/plan', 'plan'],
  ['/app/list', 'list'],
  ['/app/savings', 'savings'],
];
for (const [path, name] of shots) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(e => console.log(path, 'ERR', e.message));
  await page.waitForTimeout(3000);
  console.log(name, page.url());
  await page.screenshot({ path: `/home/ubuntu/landing-shots/${name}.png` });
}
const link = await page.locator('a[href*="/app/recipe/"]').first().getAttribute('href').catch(()=>null);
console.log('recipe link', link);
if (link) {
  await page.goto(BASE + link, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/ubuntu/landing-shots/recipe.png' });
}
await page.close();
await browser.close();
