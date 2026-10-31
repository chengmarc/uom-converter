// Conductor ampacity: the code table, ambient and bundling factors, and the terminal limit.

import { buildingSizesFor, NA_BUILDING_SIZES, type Metal } from "./conductors";

export type WiringCode = "nec" | "cec";
export type TempRating = 60 | 75 | 90;

/**
 * Amps at 30 °C with no more than three conductors in a raceway or cable: NEC Table 310.16 (2020),
 * which CEC Tables 2 and 4 (2024) match. Copper at 60/75/90 °C, then aluminum; there's no 14 AWG
 * aluminum, shown as 0.
 */
const AMPACITY: Record<string, [number, number, number, number, number, number]> = {
  "14 AWG": [15, 20, 25, 0, 0, 0],
  "12 AWG": [20, 25, 30, 15, 20, 25],
  "10 AWG": [30, 35, 40, 25, 30, 35],
  "8 AWG": [40, 50, 55, 35, 40, 45],
  "6 AWG": [55, 65, 75, 40, 50, 55],
  "4 AWG": [70, 85, 95, 55, 65, 75],
  "3 AWG": [85, 100, 115, 65, 75, 85],
  "2 AWG": [95, 115, 130, 75, 90, 100],
  "1 AWG": [110, 130, 145, 85, 100, 115],
  "1/0 AWG": [125, 150, 170, 100, 120, 135],
  "2/0 AWG": [145, 175, 195, 115, 135, 150],
  "3/0 AWG": [165, 200, 225, 130, 155, 175],
  "4/0 AWG": [195, 230, 260, 150, 180, 205],
  "250 kcmil": [215, 255, 290, 170, 205, 230],
  "300 kcmil": [240, 285, 320, 195, 230, 260],
  "350 kcmil": [260, 310, 350, 210, 250, 280],
  "400 kcmil": [280, 335, 380, 225, 270, 305],
  "500 kcmil": [320, 380, 430, 260, 310, 350],
  "600 kcmil": [350, 420, 475, 285, 340, 385],
  "700 kcmil": [385, 460, 520, 315, 375, 425],
  "750 kcmil": [400, 475, 535, 320, 385, 435],
  "800 kcmil": [410, 490, 555, 330, 395, 445],
  "900 kcmil": [435, 520, 585, 355, 425, 480],
  "1000 kcmil": [455, 545, 615, 375, 445, 500],
  "1250 kcmil": [495, 590, 665, 405, 485, 545],
  "1500 kcmil": [525, 625, 705, 435, 520, 585],
  "1750 kcmil": [545, 650, 735, 455, 545, 615],
  "2000 kcmil": [555, 665, 750, 470, 560, 630],
};

const tableAmps = (size: string, metal: Metal, rating: TempRating) => AMPACITY[size][(metal === "Cu" ? 0 : 3) + [60, 75, 90].indexOf(rating)];

/** NEC Table 310.15(B)(1), by the top of each ambient band in °C: factors at 60, 75 and 90 °C. 0 means not allowed. */
const AMBIENT: [number, number, number, number][] = [
  [25, 1.08, 1.05, 1.04],
  [30, 1, 1, 1],
  [35, 0.91, 0.94, 0.96],
  [40, 0.82, 0.88, 0.91],
  [45, 0.71, 0.82, 0.87],
  [50, 0.58, 0.75, 0.82],
  [55, 0.41, 0.67, 0.76],
  [60, 0, 0.58, 0.71],
  [65, 0, 0.47, 0.65],
  [70, 0, 0.33, 0.58],
  [75, 0, 0, 0.5],
  [80, 0, 0, 0.41],
  [85, 0, 0, 0.29],
];

/** The ambient factor for an insulation rating. Undefined where that insulation can't be used. */
function ambientFactor(ambientC: number, rating: TempRating): number | undefined {
  const row = AMBIENT.find((r) => ambientC <= r[0]);
  const factor = row?.[1 + [60, 75, 90].indexOf(rating)];
  return factor || undefined;
}

/** By the top of each conductor-count band. The NEC counts current-carrying conductors, the CEC all of them. */
const BUNDLING: Record<WiringCode, [number, number][]> = {
  nec: [[3, 1], [6, 0.8], [9, 0.7], [20, 0.5], [30, 0.45], [40, 0.4], [Infinity, 0.35]],
  cec: [[3, 1], [6, 0.8], [24, 0.7], [42, 0.6], [Infinity, 0.5]],
};
const bundlingFactor = (code: WiringCode, conductors: number) => BUNDLING[code].find((b) => conductors <= b[0])![1];

/** NEC 240.4(D): the overcurrent device these small sizes may sit behind, whatever their table value. */
const SMALL_CONDUCTOR_LIMIT: Record<Metal, Record<string, number>> = {
  Cu: { "14 AWG": 15, "12 AWG": 20, "10 AWG": 30 },
  Al: { "12 AWG": 15, "10 AWG": 25 },
};

/** Terminals: 60 °C up to 1 AWG, 75 °C above it, unless the equipment is marked otherwise. */
const defaultTerminal = (size: string): TempRating => (NA_BUILDING_SIZES.findIndex((s) => s.label === size) <= NA_BUILDING_SIZES.findIndex((s) => s.label === "1 AWG") ? 60 : 75);

interface Installation {
  metal: Metal;
  insulation: TempRating;
  ambientC: number;
  conductors: number;
  code: WiringCode;
  /** Left out, the usual rating for the size. */
  terminal?: TempRating;
  /** Motor circuits have their own overcurrent rules, so the small-conductor limit doesn't apply. */
  ignoreSmallLimit?: boolean;
}

/**
 * Usable ampacity: the table value at the insulation rating, derated, then held to what the
 * terminals allow and to the small-conductor limit. Undefined for a size or setup that has no rating.
 */
export function conductorAmpacity(size: string, i: Installation) {
  if (!(size in AMPACITY) || tableAmps(size, i.metal, 60) === 0) return undefined;
  const ambient = ambientFactor(i.ambientC, i.insulation);
  if (ambient === undefined) return undefined;
  const table = tableAmps(size, i.metal, i.insulation);
  const bundling = bundlingFactor(i.code, i.conductors);
  const derated = table * ambient * bundling;
  const terminal = Math.min(i.terminal ?? defaultTerminal(size), i.insulation) as TempRating;
  const terminalLimit = tableAmps(size, i.metal, terminal);
  const smallLimit = i.ignoreSmallLimit ? undefined : SMALL_CONDUCTOR_LIMIT[i.metal][size];
  return { table, ambient, bundling, derated, terminal, terminalLimit, smallLimit, usable: Math.min(derated, terminalLimit, smallLimit ?? Infinity) };
}

/** The smallest building wire that carries `amps`. */
export function smallestSizeForAmps(amps: number, i: Installation) {
  return buildingSizesFor(i.metal).find((s) => (conductorAmpacity(s.label, i)?.usable ?? 0) >= amps - 1e-9);
}
