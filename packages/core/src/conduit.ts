// Conduit trade sizes, metric designators and knockout punch sizes.

import { parseInches } from "./units";
import { t } from "@uom/i18n";

// ---------- Conduit trade sizes ----------

/** Trade size (inches) <-> metric designator, as used in both the CEC and NEC. */
export const CONDUIT_TRADE_SIZES: { inch: string; metric: number }[] = [
  { inch: "3/8", metric: 12 },
  { inch: "1/2", metric: 16 },
  { inch: "3/4", metric: 21 },
  { inch: "1", metric: 27 },
  { inch: "1-1/4", metric: 35 },
  { inch: "1-1/2", metric: 41 },
  { inch: "2", metric: 53 },
  { inch: "2-1/2", metric: 63 },
  { inch: "3", metric: 78 },
  { inch: "3-1/2", metric: 91 },
  { inch: "4", metric: 103 },
  { inch: "5", metric: 129 },
  { inch: "6", metric: 155 },
];

/**
 * Look up a conduit size given either form: '1-1/4"', "1 1/4 in", "1.25",
 * "35", "M35", "35 mm". Bare numbers from 12 up are read as metric designators
 * (no conduit is 12 inches), smaller ones as inches. `typed` says which system the input was in.
 */
export function conduitSize(raw: string): { inch: string; metric: number; typed: "inch" | "metric" } | { error: string } {
  let s = raw.trim().toLowerCase().replace(/(["″]|\s*(in|inch|inches)\.?)$/, "").trim();
  const metricMarked = /^m\s*\d+$/.test(s) || /\d\s*mm$/.test(s);
  s = s.replace(/^m\s*/, "").replace(/\s*mm$/, "").trim();

  if (metricMarked || (/^\d+$/.test(s) && Number(s) >= 12)) {
    const hit = CONDUIT_TRADE_SIZES.find((c) => c.metric === Number(s));
    return hit ? { ...hit, typed: "metric" } : { error: t("No conduit trade size with metric designator {n}", { n: s }) };
  }
  const v = parseInches(s);
  const hit = v === undefined ? undefined : CONDUIT_TRADE_SIZES.find((c) => Math.abs(parseInches(c.inch)! - v) < 1e-9);
  return hit ? { ...hit, typed: "inch" } : { error: t("Not a standard conduit trade size: {size}", { size: raw }) };
}

// ---------- European conduit ----------

/** European conduit sizes: the outside diameter in mm (EN 61386), with EN 60423 threads. */
const EU_CONDUIT_SIZES = [16, 20, 25, 32, 40, 50, 63];

/**
 * An M size as Europe means it, which is not a North American designator: M16 is 16 mm across,
 * trade size 16 (1/2") is 21 mm. The clearance hole is typically the thread + 0.5 mm. Undefined
 * for input that isn't an M size.
 */
export function euConduitSize(raw: string): { size: number; holeMm: number } | { error: string } | undefined {
  const m = /^m\s*(\d+)$/.exec(raw.trim().toLowerCase());
  if (!m) return undefined;
  const size = Number(m[1]);
  if (!EU_CONDUIT_SIZES.includes(size)) return { error: t("No European conduit size M{n}: they run M16, M20, M25, M32, M40, M50, M63", { n: size }) };
  return { size, holeMm: size + 0.5 };
}

// ---------- Knockouts ----------

/**
 * Typical knockout punch diameter (inches) for each conduit trade size. A copied table, not a
 * definition: punch makers differ by a few thousandths. Source: American Fittings, "NEMA
 * Recommended Hole and Drill Sizes for Trade Dimension" (amftgs.com), which matches Greenlee's
 * published punch sizes.
 */
export const KNOCKOUT_PUNCH_IN: Record<string, number> = {
  "1/2": 0.885,
  "3/4": 1.115,
  "1": 1.362,
  "1-1/4": 1.701,
  "1-1/2": 1.951,
  "2": 2.416,
  "2-1/2": 2.914,
  "3": 3.539,
  "3-1/2": 4.044,
  "4": 4.544,
};
