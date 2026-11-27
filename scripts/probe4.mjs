import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:29229');
const p = await b.contexts()[0].newPage();
await p.setViewportSize({width:1280,height:900});
await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});
console.log(await p.evaluate(async()=>{
  const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
  return { sw: regs.map(r=>r.active?.scriptURL), keys: await caches.keys() };
}));
await b.close();
