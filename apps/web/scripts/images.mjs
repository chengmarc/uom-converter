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
  // Each topic: a banner for the band across its pages, and a square for the home page's strip and
  // the thumbnails beside its converters.
  //
  // The band is the window's full width but only about 110px tall, so it shows a thin slice of the
  // banner's middle. Banners are cut 6:1 around the slice worth seeing (rows of stock, of wiring,
  // of tools, of labels) and written up to the photo's own width; under the band's navy, a photo
  // stretched past that doesn't show it. Squares go up to their crop's size: the home page's strip
  // shows them at a fifth of the window.
  //
  // Above the worker at a desk on the right edge, so the full width can be used.
  "pricing-banner": { from: "1800x1200-3.jpg", crop: { left: 0, top: 320, width: 1800, height: 300 }, widths: [800, 1200, 1800] },
  "pricing-thumb": { from: "1800x1200-3.jpg", crop: { left: 120, top: 180, width: 860, height: 860 }, widths: [240, 480, 860] },
  "wire-and-conduit-banner": { from: "topic-pricing.jpg", crop: { left: 0, top: 560, width: 2048, height: 341 }, widths: [800, 1200, 2048] },
  "wire-and-conduit-thumb": { from: "topic-pricing.jpg", crop: { left: 380, top: 280, width: 820, height: 820 }, widths: [240, 480, 820] },
  // Right of the hard hat at the left edge, and above the worker's arm at the bottom.
  "electrical-banner": { from: "banner.jpg", crop: { left: 50, top: 180, width: 1035, height: 172 }, widths: [800, 1035] },
  "electrical-thumb": { from: "banner.jpg", crop: { left: 310, top: 90, width: 550, height: 550 }, widths: [240, 550] },
  // The row of screwdrivers, above the bench and the maker's label on its edge.
  "units-banner": { from: "W082137AE-5-US1b_1500_1500.jpg", crop: { left: 300, top: 440, width: 970, height: 162 }, widths: [800, 970] },
  "units-thumb": { from: "W082137AE-5-US1b_1500_1500.jpg", crop: { left: 640, top: 100, width: 620, height: 620 }, widths: [240, 620] },
  // The labels on the cartons.
  "product-data-banner": { from: "2D-Barcodes-scaled.jpg", crop: { left: 0, top: 230, width: 1620, height: 270 }, widths: [800, 1200, 1620] },
  "product-data-thumb": { from: "2D-Barcodes-scaled.jpg", crop: { left: 150, top: 150, width: 720, height: 720 }, widths: [240, 480, 720] },
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
