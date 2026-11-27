import { chromium } from "playwright";
const MAILPIT = "http://127.0.0.1:54324"; const base = "http://localhost:3300";
async function code(addr){ for(let i=0;i<60;i++){ const l=await fetch(`${MAILPIT}/api/v1/messages?limit=100`).then(r=>r.json()); const m=(l.messages??[]).find(x=>x.To?.some(t=>t.Address.toLowerCase()===addr.toLowerCase())); if(m){const f=await fetch(`${MAILPIT}/api/v1/message/${m.ID}`).then(r=>r.json()); const c=String(f.Text??"").replace(/\S*[@:/]\S*/g," ").match(/\b(\d{6})\b/)?.[1]; if(c) return c;} await new Promise(r=>setTimeout(r,250)); } throw new Error("no code"); }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1 });
await ctx.addInitScript(() => {
  localStorage.setItem('cartfull:consent','all');
  // pre-dismiss trial banner for every plausible end date — set on first app render below
});
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
    // dismiss any banner whose close button matches
    for (const btn of document.querySelectorAll('button[aria-label]')) {
      const lbl = btn.getAttribute('aria-label') || '';
      if (/close|cerrar|dismiss/i.test(lbl)) btn.click();
    }
  });
  await page.waitForTimeout(500);
};
await prep();
await page.screenshot({path:"/tmp/r-plan.png"}); console.log("plan");
await page.goto(`${base}/app/list`,{waitUntil:"networkidle"}); await prep();
await page.screenshot({path:"/tmp/r-list.png"}); console.log("list");
await page.goto(`${base}/app/savings`,{waitUntil:"networkidle"}); await prep();
await page.screenshot({path:"/tmp/r-savings.png"}); console.log("savings");
await page.goto(`${base}/app/plan`,{waitUntil:"networkidle"});
await page.locator("a[href^='/app/recipe/']").first().click();
await page.waitForURL(/\/app\/recipe\//); await page.waitForTimeout(700); await prep();
await page.screenshot({path:"/tmp/r-recipe.png"}); console.log("recipe");
await browser.close(); console.log("done");
