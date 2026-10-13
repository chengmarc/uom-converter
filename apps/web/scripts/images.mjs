// Makes the website's photos (apps/web/src/images/) from the originals in apps/web/src/img/:
// each slot below crops its original and writes WebP files at a few widths, so a page loads only
// the size it shows. `npm run images -w @uom/web` after adding or changing an original.
//
// The originals stay out of git (.gitignore): they're large, and only the crops are published.
// To use a different photo for a slot, put it in src/img/ and change the slot's `from` and crops.
//
// Crops are { left, top, width, height } in the original's pixels. Pick them to keep faces,
// brand names and clutter out of frame; `npm run images` prints each crop's size to check.

import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const SRC = resolve(import.meta.dirname, "../src/img");
const OUT = resolve(import.meta.dirname, "../src/images");

/** Each use of a photo: its crop, and the widths it's written at (never wider than the crop). */
const SLOTS = {
  // Each topic: a 3:1 banner for the band across its pages, and a square for the home page's strip
  // and the topic's thumbnail.
  // Narrower than the photo: a worker at a desk on the right edge is left out.
  "pricing-banner": { from: "1800x1200-3.jpg", crop: { left: 0, top: 230, width: 1560, height: 520 }, widths: [800, 1200, 1560] },
  "pricing-thumb": { from: "1800x1200-3.jpg", crop: { left: 120, top: 180, width: 860, height: 860 }, widths: [240, 480] },
  "wire-and-conduit-banner": { from: "topic-pricing.jpg", crop: { left: 0, top: 300, width: 2048, height: 683 }, widths: [800, 1200, 1800] },
  "wire-and-conduit-thumb": { from: "topic-pricing.jpg", crop: { left: 380, top: 280, width: 820, height: 820 }, widths: [240, 480] },
  // Placeholders until better photos are found: small, and the panel photo has a worker in it
  // (cropped out here).
  "electrical-banner": { from: "banner.jpg", crop: { left: 60, top: 40, width: 1025, height: 342 }, widths: [800, 1025] },
  "electrical-thumb": { from: "banner.jpg", crop: { left: 310, top: 90, width: 550, height: 550 }, widths: [240, 480] },
  "units-banner": { from: "W082137AE-5-US1b_1500_1500.jpg", crop: { left: 290, top: 200, width: 1000, height: 333 }, widths: [800, 1000] },
  "units-thumb": { from: "W082137AE-5-US1b_1500_1500.jpg", crop: { left: 640, top: 100, width: 620, height: 620 }, widths: [240, 480] },
  "product-data-banner": { from: "2D-Barcodes-scaled.jpg", crop: { left: 0, top: 150, width: 1620, height: 540 }, widths: [800, 1200, 1620] },
  "product-data-thumb": { from: "2D-Barcodes-scaled.jpg", crop: { left: 150, top: 150, width: 720, height: 720 }, widths: [240, 480] },
};

mkdirSync(OUT, { recursive: true });
// Start clean, so a slot's old sizes don't linger after its crop or widths change.
for (const f of readdirSync(OUT)) if (f.endsWith(".webp")) rmSync(join(OUT, f));

const originals = new Set(readdirSync(SRC));
for (const [name, { from, crop, widths, quality = 78 }] of Object.entries(SLOTS)) {
  if (!originals.has(from)) throw new Error(`${name}: no ${from} in ${SRC}`);
  const meta = await sharp(join(SRC, from)).metadata();
  if (crop.left + crop.width > meta.width || crop.top + crop.height > meta.height) {
    throw new Error(`${name}: crop goes past ${from}'s ${meta.width}×${meta.height}`);
  }
  for (const w of widths.filter((w) => w <= crop.width)) {
    // EXIF and other metadata are left out: rotate() applies the orientation first.
    await sharp(join(SRC, from))
      .rotate()
      .extract(crop)
      .resize({ width: w })
      .webp({ quality, effort: 6 })
      .toFile(join(OUT, `${name}-${w}.webp`));
  }
  console.log(`${name}: ${from} ${crop.width}×${crop.height} → ${widths.filter((w) => w <= crop.width).join(", ")} wide`);
}
