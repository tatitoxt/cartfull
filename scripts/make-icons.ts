/** Renders the PNG app icons from public/icons/icon.svg. Run: npx tsx scripts/make-icons.ts */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const dir = join(process.cwd(), "public", "icons");
const svg = readFileSync(join(dir, "icon.svg"), "utf8");
const glyph = svg.replace(/<rect[^>]*\/>/, "");

async function main() {
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(join(dir, `icon-${size}.png`));
  }
  // Maskable and Apple icons are full-bleed squares with the glyph inside the safe zone.
  for (const [name, size, scale] of [
    ["icon-maskable-512.png", 512, 0.72],
    ["apple-touch-icon.png", 180, 0.86],
  ] as const) {
    const inner = Math.round(size * scale);
    const mark = await sharp(Buffer.from(glyph), { density: 600 }).resize(inner, inner).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#101206" } })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toFile(join(dir, name));
  }
}

main();
