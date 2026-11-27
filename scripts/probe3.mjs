import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:29229');
const p = await b.contexts()[0].newPage();
await p.setViewportSize({width:1280,height:900});
await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});
const out = await p.evaluate(()=>{
  const rules=[...document.styleSheets].flatMap(s=>{try{return[...s.cssRules]}catch{return[]}});
  const flat=[];
  const walk=(rs)=>rs.forEach(r=>{flat.push(r.cssText); if(r.cssRules) walk([...r.cssRules])});
  walk(rules);
  return {
    total: flat.length,
    lgRules: flat.filter(t=>t.includes('lg\\:')).slice(0,10),
    cols57: flat.filter(t=>t.includes('57')),
    gridCols: flat.filter(t=>t.includes('grid-cols')).slice(0,15),
  };
});
console.log(JSON.stringify(out,null,1));
await b.close();
