import { chromium } from "playwright";
const MAILPIT = "http://127.0.0.1:54324"; const base = "http://localhost:3100";
async function code(addr){ for(let i=0;i<60;i++){ const l=await fetch(`${MAILPIT}/api/v1/messages?limit=100`).then(r=>r.json()); const m=(l.messages??[]).find(x=>x.To?.some(t=>t.Address.toLowerCase()===addr.toLowerCase())); if(m){const f=await fetch(`${MAILPIT}/api/v1/message/${m.ID}`).then(r=>r.json()); const c=String(f.Text??"").replace(/\S*[@:/]\S*/g," ").match(/\b(\d{6})\b/)?.[1]; if(c) return c;} await new Promise(r=>setTimeout(r,250)); } throw new Error("no code"); }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
await ctx.addInitScript(() => { localStorage.setItem('cartfull:consent','all'); });
const page = await ctx.newPage();
await page.goto(`${base}/login`,{waitUntil:"networkidle"});
await page.getByLabel(/email|correo electrónico/i).fill("tester@cartfull.dev");
await page.getByRole("button",{name:/email me a sign-in link|enviarme un enlace/i}).click();
await page.getByLabel(/code|código/i).fill(await code("tester@cartfull.dev"));
await page.getByRole("button",{name:/^(sign in|entrar)$/i}).click();
await page.waitForURL(/\/app\/plan/,{timeout:30000});
await page.goto(`${base}/app/account`,{waitUntil:"networkidle"});
await page.evaluate(() => {
  document.querySelectorAll('nextjs-portal').forEach(n => n.style.display='none');
  document.getElementById('appearance-title')?.scrollIntoView({block:'start'});
});
await page.waitForTimeout(800);
await page.screenshot({path:'/tmp/t-appearance-dark.png'});
// now click Light and re-shoot
await page.locator('[data-testid="theme-light"]').click();
await page.waitForTimeout(500);
await page.screenshot({path:'/tmp/t-appearance-light.png'});
// click Automatic
await page.locator('[data-testid="theme-auto"]').click();
await page.waitForTimeout(300);
console.log('done');
await browser.close();
