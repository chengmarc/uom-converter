// Distributor pricing: E/C/M price units, price per length, discounts, margin, packs and
// price quantities.

import { M_PER_FT } from "./units";

// ---------- Pricing units of measure ----------

/**
 * Price UOM codes used in North American electrical distribution:
 * E = per each, C = per 100, M = per 1000. Wire is commonly priced per M feet.
 */
export type PriceUom = "E" | "C" | "M";
export const UOM_FACTOR: Record<PriceUom, number> = { E: 1, C: 100, M: 1000 };

export function parseUom(raw: string): PriceUom | undefined {
  const s = raw.trim().toUpperCase();
  if (["E", "EA", "EACH"].includes(s)) return "E";
  if (["C", "CFT", "/100", "PER 100"].includes(s)) return "C";
  if (["M", "MFT", "/1000", "PER 1000"].includes(s)) return "M";
  return undefined;
}

export function convertPrice(price: number, from: PriceUom, to: PriceUom): number {
  return (price / UOM_FACTOR[from]) * UOM_FACTOR[to];
}

/** Extended price for a quantity (in each / feet) at a price per UOM. */
export function extendedPrice(qty: number, price: number, uom: PriceUom): number {
  return (qty * price) / UOM_FACTOR[uom];
}

/**
 * Compare two prices for the same item (e.g. supplier file vs. your system).
 * If one is ~10x, ~100x, or ~1000x the other, it's almost always a UOM mix-up
 * (a per-C price loaded as per-each, and so on). Returns the suspected factor.
 */
export function suspectUomMismatch(a: number, b: number, tolerance = 0.05): number | undefined {
  if (a <= 0 || b <= 0) return undefined;
  const ratio = Math.max(a, b) / Math.min(a, b);
  return [10, 100, 1000].find((f) => Math.abs(ratio / f - 1) <= tolerance);
}

// ---------- Price per length ----------

/** Wire price units by length, as metres per unit (C ft = 100 ft, M ft = 1000 ft). */
export type LengthPriceUnit = "ft" | "Cft" | "Mft" | "m" | "km";
export const METRES_PER_PRICE_UNIT: Record<LengthPriceUnit, number> = {
  ft: M_PER_FT,
  Cft: 100 * M_PER_FT,
  Mft: 1000 * M_PER_FT,
  m: 1,
  km: 1000,
};

export function convertLengthPrice(price: number, from: LengthPriceUnit, to: LengthPriceUnit): number {
  return (price / METRES_PER_PRICE_UNIT[from]) * METRES_PER_PRICE_UNIT[to];
}

// ---------- List × multiplier ----------

/**
 * Discount chain to multiplier: "50/10" means 50% off, then 10% off that, so × 0.5 × 0.9 = 0.45.
 * Also takes a single discount ("35", "35%").
 */
export function discountToMultiplier(raw: string): number | { error: string } {
  const parts = raw.replace(/%/g, "").split("/").map((p) => p.trim());
  if (parts.some((p) => !/^(\d+(\.\d+)?|\.\d+)$/.test(p) || Number(p) > 100)) {
    return { error: "Enter a discount like 35 or a chain like 50/10/5" };
  }
  return parts.reduce((m, p) => m * (1 - Number(p) / 100), 1);
}

/** The single discount (%) equivalent to a multiplier. */
export const multiplierToDiscount = (multiplier: number) => (1 - multiplier) * 100;

// ---------- Margin and markup ----------

/** Margin is profit as a share of the sell price; markup is profit as a share of cost. Both as fractions. */
export const marginToMarkup = (margin: number) => margin / (1 - margin);
export const markupToMargin = (markup: number) => markup / (1 + markup);
export const sellFromCostAtMargin = (cost: number, margin: number) => cost / (1 - margin);

// ---------- Packs and put-ups ----------

/**
 * Whole packs (boxes, coils, reels) needed to cover a quantity, and how much is left over.
 * Works for eaches per box or feet per reel alike.
 */
export function unitsToOrder(needed: number, perUnit: number): { units: number; total: number; over: number } {
  // Tiny tolerance so 0.1 + 0.2 style rounding doesn't order an extra pack.
  const units = needed <= 0 ? 0 : Math.ceil(needed / perUnit - 1e-9);
  const total = units * perUnit;
  return { units, total, over: total - needed };
}

// ---------- Price quantity ----------

/**
 * Price files (BMEcat, most ERPs) give a price for a *price quantity* of *order units*, and
 * each order unit can hold several *content units* (e.g. a box of 100 connectors).
 */
export function unitPrice(price: number, priceQuantity = 1, contentUnitsPerOrderUnit = 1) {
  const perOrderUnit = price / priceQuantity;
  return { perOrderUnit, perContentUnit: perOrderUnit / contentUnitsPerOrderUnit };
}
