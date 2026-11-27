import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const b = await chromium.connectOverCDP('http://localhost:29229');
const p = await b.contexts()[0].newPage();
async function shot(svgPath, out, px) {
  const svg = readFileSync(svgPath, 'utf8');
  await p.setViewportSize({ width: px, height: px });
  await p.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body>`);
  await p.waitForTimeout(200);
  await p.locator('svg').first().screenshot({ path: out, omitBackground: true });
  console.log(out);
}
await shot('public/icons/icon.svg', '/tmp/icon-2048.png', 2048);
await shot('/tmp/maskable.svg', '/tmp/icon-maskable-2048.png', 2048);
await b.close();
