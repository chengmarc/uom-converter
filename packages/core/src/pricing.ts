// Distributor pricing: E/C/M price units, price per length, discounts, margin, packs and
// price quantities.

import { FT_PER_M, LB_PER_KG, M_PER_FT } from "./units";
import { t } from "@uom/i18n";

// ---------- Pricing units of measure ----------

/**
 * Price UOM codes used in North American electrical distribution:
 * E = per each, C = per 100, M = per 1000. Wire is commonly priced per M feet.
 */
export type PriceUom = "E" | "C" | "M";
const UOM_FACTOR: Record<PriceUom, number> = { E: 1, C: 100, M: 1000 };

export function convertPrice(price: number, from: PriceUom, to: PriceUom): number {
  return (price / UOM_FACTOR[from]) * UOM_FACTOR[to];
}

/**
 * Ratios that mean a UOM mix-up, closest-packed first so 12 is tried before 10. Powers of ten get a
 * wide band, since two sources' prices can also differ for real; the rest would catch ordinary
 * price gaps if they were as wide.
 */
const MIX_UPS = [
  { factor: LB_PER_KG, tolerance: 0.05 },
  { factor: FT_PER_M, tolerance: 0.05 },
  { factor: 12, tolerance: 0.05 },
  { factor: 25, tolerance: 0.05 },
  { factor: 50, tolerance: 0.05 },
  { factor: 10, tolerance: 0.15 },
  { factor: 100, tolerance: 0.15 },
  { factor: 1000, tolerance: 0.15 },
];

/**
 * Compare two prices for the same item (e.g. supplier file vs. your system). If their ratio is
 * near one of MIX_UPS, it's probably a UOM mix-up (a per-C price loaded as per-each, per foot
 * against per metre, and so on). Returns the suspected factor.
 */
export function suspectUomMismatch(a: number, b: number): number | undefined {
  if (a <= 0 || b <= 0) return undefined;
  const ratio = Math.max(a, b) / Math.min(a, b);
  return MIX_UPS.find((m) => Math.abs(ratio / m.factor - 1) <= m.tolerance)?.factor;
}

// ---------- Price per length ----------

/** Wire price units by length, as metres per unit (C ft = 100 ft, M ft = 1000 ft). */
type LengthPriceUnit = "ft" | "Cft" | "Mft" | "m" | "km";
export const METRES_PER_PRICE_UNIT: Record<LengthPriceUnit, number> = {
  ft: M_PER_FT,
  Cft: 100 * M_PER_FT,
  Mft: 1000 * M_PER_FT,
  m: 1,
  km: 1000,
};

// ---------- Metal surcharge ----------

/** What a metal price over base adds per M ft of wire. Negative below base: a credit. */
export const metalSurcharge = (lbPerMft: number, spotPerLb: number, basePerLb: number) => lbPerMft * (spotPerLb - basePerLb);

// ---------- List × multiplier ----------

/**
 * Discount chain to multiplier: "50/10" means 50% off, then 10% off that, so × 0.5 × 0.9 = 0.45.
 * Also takes a single discount ("35", "35%").
 */
export function discountToMultiplier(raw: string): number | { error: string } {
  const parts = raw.replace(/%/g, "").split("/").map((p) => p.trim());
  if (parts.some((p) => !/^(\d+(\.\d+)?|\.\d+)$/.test(p) || Number(p) > 100)) {
    return { error: t("Enter a discount like 35 or a chain like 50/10/5") };
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

/**
 * Coils or reels for a set of pulls. A pull can't be spliced, so each one has to come whole from
 * a single reel: three 300 ft pulls need three 500 ft spools, not two. Undefined when one pull
 * doesn't fit on a reel at all.
 */
export function reelsForPulls(pull: number, pulls: number, reel: number) {
  const perReel = Math.floor(reel / pull + 1e-9);
  if (perReel === 0) return undefined;
  const units = Math.ceil(pulls / perReel);
  const total = pull * pulls;
  const onLast = pulls - (units - 1) * perReel;
  return { units, perReel, total, over: units * reel - total, lastUsed: (onLast * pull) / reel };
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
