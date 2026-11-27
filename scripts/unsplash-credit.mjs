import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0] || await browser.newContext();
const page = await ctx.newPage();
const pages = JSON.parse(process.argv[2]);
for (const p of pages) {
  try {
    await page.goto(p, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const m = html.match(/"name":"([^"]{2,60})","username":"([^"]+)"/);
      const m2 = html.match(/"author":\s*\{[^}]*"name":"([^"]+)"/);
      return { name: m ? m[1] : (m2 ? m2[1] : null) };
    });
    console.log(p.split('/').pop(), '=>', JSON.stringify(info));
  } catch (e) { console.log(p, 'ERR', e.message.slice(0, 60)); }
}
await page.close(); await browser.close();
