// Conduit fill: conductor areas against what a raceway may hold.

import { CONDUIT_TRADE_SIZES } from "./conduit";

/** Insulation, as NEC Chapter 9 Table 5 groups it. */
export type WireType = "thhn" | "xhhw";

/** Approximate area in in², NEC Chapter 9 Table 5: THHN/THWN-2, then XHHW/USE-2. */
const WIRE_AREA: Record<string, [number, number]> = {
  "14 AWG": [0.0097, 0.0139],
  "12 AWG": [0.0133, 0.0181],
  "10 AWG": [0.0211, 0.0243],
  "8 AWG": [0.0366, 0.0437],
  "6 AWG": [0.0507, 0.059],
  "4 AWG": [0.0824, 0.0814],
  "3 AWG": [0.0973, 0.0962],
  "2 AWG": [0.1158, 0.1146],
  "1 AWG": [0.1562, 0.1534],
  "1/0 AWG": [0.1855, 0.1825],
  "2/0 AWG": [0.2223, 0.219],
  "3/0 AWG": [0.2679, 0.2642],
  "4/0 AWG": [0.3237, 0.3197],
  "250 kcmil": [0.397, 0.3904],
  "300 kcmil": [0.4608, 0.4536],
  "350 kcmil": [0.5242, 0.5166],
  "400 kcmil": [0.5863, 0.5782],
  "500 kcmil": [0.7073, 0.6984],
};

/** The sizes the area table covers. */
export const FILL_WIRE_SIZES = Object.keys(WIRE_AREA);

/** Total internal area of EMT in in², by trade size (NEC Chapter 9 Table 4). */
const EMT_AREA: Record<string, number> = {
  "1/2": 0.304,
  "3/4": 0.533,
  "1": 0.864,
  "1-1/4": 1.496,
  "1-1/2": 2.036,
  "2": 3.356,
  "2-1/2": 5.858,
  "3": 8.846,
  "3-1/2": 11.545,
  "4": 14.753,
};

/** EMT trade sizes, smallest first. */
export const EMT_SIZES = CONDUIT_TRADE_SIZES.filter((c) => c.inch in EMT_AREA);

/** Chapter 9 Table 1: one conductor 53%, two 31%, more 40%. A nipple of 24 in or less may reach 60%. */
const fillLimit = (conductors: number, nipple: boolean) => (nipple ? 0.6 : conductors === 1 ? 0.53 : conductors === 2 ? 0.31 : 0.4);

interface WireLine {
  size: string;
  count: number;
}

/** Conductor area in a raceway, the smallest EMT that takes it, and how full a chosen size would be. */
export function conduitFill(lines: WireLine[], type: WireType, nipple: boolean, conduit?: string) {
  const column = type === "thhn" ? 0 : 1;
  const conductors = lines.reduce((n, l) => n + l.count, 0);
  const area = lines.reduce((sum, l) => sum + l.count * WIRE_AREA[l.size][column], 0);
  const limit = fillLimit(conductors, nipple);
  const fits = (inch: string) => area <= EMT_AREA[inch] * limit + 1e-9;
  return {
    conductors,
    area,
    limit,
    smallest: EMT_SIZES.find((c) => fits(c.inch)),
    chosen: conduit === undefined ? undefined : { percent: (area / EMT_AREA[conduit]) * 100, fits: fits(conduit) },
  };
}
