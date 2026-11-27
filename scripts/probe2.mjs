import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:29229');
const p = await b.contexts()[0].newPage();
await p.setViewportSize({width:1280,height:900});
await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});
console.log(await p.evaluate(()=>({
  rootFont: getComputedStyle(document.documentElement).fontSize,
  lg: matchMedia('(min-width:64rem)').matches,
  lgPx: matchMedia('(min-width:1024px)').matches,
  xl: matchMedia('(min-width:80rem)').matches,
  cssHasLg: [...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch{return[]}}).filter(r=>r.cssText?.includes('64rem')).length,
})));
await b.close();
