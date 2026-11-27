import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0] || await browser.newContext();
const page = await ctx.newPage();
const queries = JSON.parse(process.argv[2]);
for (const q of queries) {
  try {
    await page.goto(`https://unsplash.com/s/photos/${q}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('figure img', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const res = await page.$$eval('figure', figs => figs.slice(0, 6).map(f => {
      const img = f.querySelector('img');
      const a = f.querySelector('a[href^="/photos/"]');
      const by = f.querySelector('a[href^="/@"]');
      return { page: a ? a.href : null, img: img ? img.src.split('?')[0] : null, alt: img ? img.alt.slice(0, 70) : '', who: by ? by.textContent : '' };
    }));
    console.log('===', q);
    for (const r of res) console.log(JSON.stringify(r));
  } catch (e) { console.log('===', q, 'ERR', e.message.slice(0, 80)); }
}
await page.close(); await browser.close();
