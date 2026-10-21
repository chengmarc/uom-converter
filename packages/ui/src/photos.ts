// The photos in @uom/brand (packages/brand/photos/, made by its photos.mjs): each slot at a
// few widths, as "<slot>-<width>.webp". An app chooses the files it bundles with its own
// import.meta.glob, so it ships only the sizes it shows (through @uom/brand/vite's photos() plugin),
// and hands them to photoLibrary:
//
//   const photo = photoLibrary(
//     import.meta.glob("@uom/brand/photos/*.webp", { eager: true, query: "?url", import: "default" }),
//   );

import type { Topic } from "@uom/converters/model";
import { el } from "./converter";

/**
 * Each topic's photos: "<slot>-banner", cut 6:1 for a band across a page, and "<slot>-thumb",
 * square. Typed, so a new topic can't ship without them; photos.test.ts checks the files are there.
 */
export const TOPIC_SLOTS: Record<Topic, string> = {
  Pricing: "pricing",
  "Wire & conduit": "wire-and-conduit",
  Electrical: "electrical",
  Units: "units",
  "Product data": "product-data",
};

/**
 * The photos in `files` (an eager import.meta.glob of photo URLs), as a function that draws a slot
 * as an <img> with every width it was given, so the browser loads the one it needs for `sizes`
 * (how wide it's shown). `alt` is empty when the photo only decorates. Undefined when the slot
 * has no photo: the page goes without.
 */
export function photoLibrary(files: Record<string, string>) {
  const slots = new Map<string, { width: number; url: string }[]>();
  for (const [path, url] of Object.entries(files)) {
    const base = path.slice(path.lastIndexOf("/") + 1, -".webp".length);
    const dash = base.lastIndexOf("-");
    const slot = base.slice(0, dash);
    slots.set(slot, [...(slots.get(slot) ?? []), { width: Number(base.slice(dash + 1)), url }].sort((a, b) => a.width - b.width));
  }

  return function photo(slot: string, sizes: string, alt: string, cls?: string): HTMLImageElement | undefined {
    const sizesOfSlot = slots.get(slot);
    if (!sizesOfSlot) return undefined;
    const img = el("img", cls);
    img.src = sizesOfSlot.at(-1)!.url;
    img.srcset = sizesOfSlot.map((f) => `${f.url} ${f.width}w`).join(", ");
    img.sizes = sizes;
    img.alt = alt;
    img.decoding = "async";
    return img;
  };
}
