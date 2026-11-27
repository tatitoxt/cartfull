import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://localhost:29229');
const p = await b.contexts()[0].newPage();
await p.setViewportSize({width:1280,height:900});
await p.goto('http://localhost:3100/',{waitUntil:'networkidle'});
const info = await p.evaluate(()=>{
  const ul = document.querySelector('ul[aria-label="Cartfull screens"], ul:has(li figure)');
  const out = {vw: innerWidth};
  document.querySelectorAll('ul').forEach(u=>{
    const cols = getComputedStyle(u).gridTemplateColumns;
    if (cols && cols !== 'none') out[u.getAttribute('aria-label')||u.className.slice(0,60)] = cols;
  });
  const grid = document.querySelector('.grid.grid-cols-\\[57\\%_43\\%\\]') || [...document.querySelectorAll('div.grid')].find(d=>d.className.includes('57%'));
  if (grid) {
    out.heroGrid = getComputedStyle(grid).gridTemplateColumns;
    out.heroChildren = [...grid.children].map(c=>({cls:c.className.slice(0,50), rect:JSON.stringify(c.getBoundingClientRect())}));
  }
  return out;
});
console.log(JSON.stringify(info,null,1));
await b.close();
