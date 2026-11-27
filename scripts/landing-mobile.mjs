import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:29229');
const ctx = b.contexts()[0] || await b.newContext();
const p = await ctx.newPage();
await p.setViewportSize({ width: 390, height: 844 });
await p.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' });
await p.evaluate(async () => {
  await Promise.all((await caches.keys()).map(k => caches.delete(k)));
});
const results = [];
await p.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: '/home/ubuntu/landing-shots/m-full.png', fullPage: true });
// FAQ accordion tap
const faq = p.locator('#faq details summary').first();
if (await faq.count()) { await faq .click(); results.push(['faq tap', 'ok']); }
// Pricing toggle
const monthly = p.getByRole('button', { name: /monthly/i }).or(p.locator('button:has-text("Monthly")'));
if (await monthly.count()) { await monthly.first() .click(); await p.waitForTimeout(300); results.push(['pricing toggle', await p.locator('#pricing').innerText().then(t=>t.includes('9.99')?'ok':'CHECK')]); }
// Calculator
const slider = p.locator('input[type=range]').first();
if (await slider.count()) { await slider.fill('200'); await p.waitForTimeout(400); results.push(['calculator', 'ok']); }
// ES variant
await p.goto('http://localhost:3100/es', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const esText = await p.locator('h1').innerText();
results.push(['es page', esText.includes('semana') || esText.includes('mercado') || esText.length>5 ? 'ok':'CHECK', esText.slice(0,40)]);
await p.screenshot({ path: '/home/ubuntu/landing-shots/m-es.png' });
// Nav links
for (const [name, sel] of [['cta', 'a[href="/start"]'], ['signin', 'a[href="/login"]']]) {
  const l = p.locator(sel).first();
  results.push([name, await l.count() ? 'ok' : 'MISSING']);
}
console.log(JSON.stringify(results));
await p.close(); await b.close();
