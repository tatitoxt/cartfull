import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
for (const n of ['g','h','i']) {
  const svg = fs.readFileSync(`/tmp/logo-opts3/${n}.svg`, 'utf8');
  await p.setContent(`<body style="margin:0">${svg}</body>`);
  await p.locator('svg').screenshot({ path: `/tmp/logo-${n}.png` });
}
await b.close();
console.log('done');
