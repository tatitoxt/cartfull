import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://localhost:29229');
const ctx = browser.contexts()[0];
const pages = ctx.pages();
const page = pages.find(p => p.url().includes('vercel.com/domains')) || pages[pages.length-1];
// scroll to load all rows
await page.mouse.wheel(0, 3000);
await page.waitForTimeout(2500);
const rows = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('a, div, li, tr').forEach(el => {
    const t = el.innerText || '';
    if (/cartf\s*ull/i.test(t) && /\$\d/.test(t) && t.length < 200) {
      out.push(t.replace(/\s+/g, ' ').trim());
    }
  });
  return [...new Set(out)].slice(0, 40);
});
console.log(rows.join('\n'));
await browser.close();
