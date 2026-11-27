import { chromium } from "playwright";
const MAILPIT = "http://127.0.0.1:54324"; const base = "http://localhost:3100";
async function code(addr){ for(let i=0;i<60;i++){ const l=await fetch(`${MAILPIT}/api/v1/messages?limit=100`).then(r=>r.json()); const m=(l.messages??[]).find(x=>x.To?.some(t=>t.Address.toLowerCase()===addr.toLowerCase())); if(m){const f=await fetch(`${MAILPIT}/api/v1/message/${m.ID}`).then(r=>r.json()); const c=String(f.Text??"").replace(/\S*[@:/]\S*/g," ").match(/\b(\d{6})\b/)?.[1]; if(c) return c;} await new Promise(r=>setTimeout(r,250)); } throw new Error("no code"); }
const theme = process.argv[2] || 'light';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
await ctx.addInitScript((t) => {
  localStorage.setItem('cartfull:consent','all');
  localStorage.setItem('cartfull:theme', t);
}, theme);
const page = await ctx.newPage();
await page.goto(`${base}/login`,{waitUntil:"networkidle"});
await page.getByLabel(/email|correo electrónico/i).fill("tester@cartfull.dev");
await page.getByRole("button",{name:/email me a sign-in link|enviarme un enlace/i}).click();
await page.getByLabel(/code|código/i).fill(await code("tester@cartfull.dev"));
await page.getByRole("button",{name:/^(sign in|entrar)$/i}).click();
await page.waitForURL(/\/app\/plan/,{timeout:30000});
const prep = async () => {
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach(n => n.style.display='none');
    for (const btn of document.querySelectorAll('button[aria-label]')) {
      const lbl = btn.getAttribute('aria-label') || '';
      if (/close|cerrar|dismiss/i.test(lbl)) btn.click();
    }
  });
  await page.waitForTimeout(600);
};
await prep();
await page.screenshot({path:`/tmp/t-${theme}-plan.png`}); console.log("plan");
await page.goto(`${base}/app/list`,{waitUntil:"networkidle"}); await prep();
await page.screenshot({path:`/tmp/t-${theme}-list.png`}); console.log("list");
await page.goto(`${base}/app/account`,{waitUntil:"networkidle"}); await prep();
await page.evaluate(() => document.querySelector('#appearance-title')?.scrollIntoView({block:'center'}));
await page.waitForTimeout(400);
await page.screenshot({path:`/tmp/t-${theme}-account.png`}); console.log("account");
await browser.close(); console.log("done");
