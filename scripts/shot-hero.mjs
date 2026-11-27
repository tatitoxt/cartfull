import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:29229');
const p = await b.contexts()[0].newPage();
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
// clear stale SW/caches (prod-gated anyway)
await p.evaluate(async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  for (const k of await caches.keys()) await caches.delete(k);
});
await p.reload({ waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/hero-new.png' });
await p.close(); await b.close();
