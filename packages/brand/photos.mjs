// Makes the apps' photos (photos/) from the originals in originals/: each slot below crops its
// original and writes WebP files at a few widths, so a page loads only the size it shows. Each app
// bundles the ones it uses (@uom/ui/photos). `npm run photos -w @uom/brand` after adding or
// changing an original.
//
// The originals stay out of git (.gitignore): they're large, and only the crops are published.
// To use a different photo for a slot, put it in originals/ and change the slot's `from` and crops.
//
// Crops are { left, top, width, height } in the original's pixels (none: the whole photo). Pick
// them to keep faces, brand names and clutter out of frame; `npm run photos` prints each crop's
// size to check.

import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const SRC = resolve(import.meta.dirname, "originals");
const OUT = resolve(import.meta.dirname, "photos");

/** Each use of a photo: its crop, and the widths it's written at (never wider than the crop). */
const SLOTS = {
  // Each topic: a banner for the band across its pages, and a square for the home page's strip and
  // the thumbnails beside its converters. Every topic needs both (@uom/ui/photos TOPIC_SLOTS), at
  // 240 and 800 at least: the Android app shows those two.
  //
  // On the website, the band is the window's full width but only about 110px tall, so it shows a
  // thin slice of the banner's middle. Banners are cut 6:1 around the slice worth seeing (rows of
  // stock, of wiring, of tools, of labels) and written up to the photo's own width; under the
  // band's navy, a photo stretched past that doesn't show it. Squares go up to their crop's size:
  // the home page's strip shows them at a fifth of the window.
  //
  // A supplier's sales floor: the shelves below the signs on the back wall (makers' names, deals,
  // "circuit breakers"), the blue bins and the packs on the stands.
  "pricing-banner": { from: "cat-pricing.jpg", crop: { left: 0, top: 540, width: 1800, height: 300 }, widths: [800, 1200, 1800] },
  "pricing-thumb": { from: "cat-pricing.jpg", crop: { left: 530, top: 500, width: 700, height: 700 }, widths: [240, 480, 700] },
  // The copper coils, right of the worker and left of the reel with its maker's name: the two at
  // the back and the big one's rim for the banner, the big one's eye for the square.
  "wire-and-conduit-banner": { from: "cat-wire-conduits.jpg", crop: { left: 1950, top: 850, width: 3600, height: 600 }, widths: [800, 1200, 2048] },
  "wire-and-conduit-thumb": { from: "cat-wire-conduits.jpg", crop: { left: 2600, top: 1300, width: 2200, height: 2200 }, widths: [240, 480, 820] },
  // A clamp meter on a panel: the meter, the gloves and the row of contactors.
  "electrical-banner": { from: "cat-electrical.jpg", crop: { left: 0, top: 400, width: 1920, height: 320 }, widths: [800, 1200, 1920] },
  "electrical-thumb": { from: "cat-electrical.jpg", crop: { left: 250, top: 200, width: 1000, height: 1000 }, widths: [240, 480, 1000] },
  // Tools on a black pegboard, above the drills and batteries with their maker's name: the racks
  // of red-held wrenches, the hammer and the hanging spanners for the banner; the racks, pliers
  // and screwdrivers on the left for the square.
  "units-banner": { from: "cat-units.jpg", crop: { left: 0, top: 500, width: 1500, height: 250 }, widths: [800, 1200, 1500] },
  "units-thumb": { from: "cat-units.jpg", crop: { left: 0, top: 300, width: 620, height: 620 }, widths: [240, 480, 620] },
  // The labels on the cartons.
  "product-data-banner": { from: "cat-pim.jpg", crop: { left: 0, top: 230, width: 1620, height: 270 }, widths: [800, 1200, 1620] },
  "product-data-thumb": { from: "cat-pim.jpg", crop: { left: 150, top: 150, width: 720, height: 720 }, widths: [240, 480, 720] },

  // Not a topic's: a pylon and its lines against the evening sky, whole, behind the Windows app's
  // Store images (apps/windows/store/brand.css) and in the website's grey either side of the page
  // (apps/web/src/style.css). Each shows it dimmed, blurred or under navy, so it can be lighter
  // than the others.
  backdrop: { from: "base.jpg", widths: [2560], quality: 64 },
};

mkdirSync(OUT, { recursive: true });
// Start clean, so a slot's old sizes don't linger after its crop or widths change.
for (const f of readdirSync(OUT)) if (f.endsWith(".webp")) rmSync(join(OUT, f));

const originals = new Set(readdirSync(SRC));
for (const [name, { from, crop: cut, widths, quality = 78 }] of Object.entries(SLOTS)) {
  if (!originals.has(from)) throw new Error(`${name}: no ${from} in ${SRC}`);
  const meta = await sharp(join(SRC, from)).metadata();
  // No crop: the whole photo, the way up (rotate() below turns it so).
  const { width, height } = meta.autoOrient ?? meta;
  const crop = cut ?? { left: 0, top: 0, width, height };
  if (crop.left + crop.width > width || crop.top + crop.height > height) {
    throw new Error(`${name}: crop goes past ${from}'s ${width}×${height}`);
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
