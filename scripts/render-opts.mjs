import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
for (const n of ['d','e','f']) {
  const svg = fs.readFileSync(`/tmp/logo-opts/${n}.svg`, 'utf8');
  await p.setContent(`<body style="margin:0">${svg}</body>`);
  await p.locator('svg').screenshot({ path: `/tmp/logo-${n}.png`, omitBackground: false });
}
await b.close();
console.log('done');
