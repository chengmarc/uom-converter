// Conduit trade sizes, metric designators and knockout punch sizes.

import { parseInches } from "./units";

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
    return hit ? { ...hit, typed: "metric" } : { error: `No conduit trade size with metric designator ${s}` };
  }
  const v = parseInches(s);
  const hit = v === undefined ? undefined : CONDUIT_TRADE_SIZES.find((c) => Math.abs(parseInches(c.inch)! - v) < 1e-9);
  return hit ? { ...hit, typed: "inch" } : { error: `Not a standard conduit trade size: ${raw}` };
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
