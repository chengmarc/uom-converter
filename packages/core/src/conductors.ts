// Conductor sizes (AWG, kcmil, IEC mm²), weight, resistance and voltage drop, from definitions.

import type { Phase } from "./electrical";
import { LB_PER_KG, M_PER_FT } from "./units";
import { t } from "@uom/i18n";

// ---------- Conductor sizes ----------

/** 1 kcmil in mm² (1 circular mil = π/4 × 0.0254² mm²). */
const MM2_PER_KCMIL = (Math.PI / 4) * 0.0254 ** 2 * 1000;

/** IEC 60228 standard metric conductor sizes, mm². */
export const METRIC_SIZES_MM2 = [
  0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630, 800, 1000,
];

type ConductorSize = { system: "AWG"; awg: number; label: string } | { system: "kcmil"; kcmil: number; label: string };

/**
 * Parse "12", "12 AWG", "#12", "1/0", "4/0", "250 kcmil", "250 MCM".
 * AWG n/0 is stored as 1 - n (1/0 = 0, 2/0 = -1, 3/0 = -2, 4/0 = -3), which is
 * what the AWG formula expects.
 */
export function parseConductor(raw: string): ConductorSize | { error: string } {
  const s = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s*awg$/, "").trim();
  const k = /^(\d+(?:\.\d+)?)\s*(kcmil|mcm)$/.exec(s);
  if (k && Number(k[1]) > 0) return { system: "kcmil", kcmil: Number(k[1]), label: `${k[1]} kcmil` };
  const zeros = /^([1-4])\/0$/.exec(s);
  if (zeros) return { system: "AWG", awg: 1 - Number(zeros[1]), label: `${zeros[1]}/0 AWG` };
  if (/^(0+)$/.test(s) && s.length <= 4) return { system: "AWG", awg: 1 - s.length, label: `${s.length}/0 AWG` };
  if (/^\d{1,2}$/.test(s) && Number(s) >= 1 && Number(s) <= 40) {
    return { system: "AWG", awg: Number(s), label: `${Number(s)} AWG` };
  }
  return { error: t('Use an AWG size ("12", "1/0", "4/0") or kcmil ("250 kcmil")') };
}

/** AWG definition: diameter = 0.005 in × 92^((36 - n) / 39). */
function awgDiameterMm(awg: number): number {
  return 0.127 * 92 ** ((36 - awg) / 39);
}

function awgAreaKcmil(awg: number): number {
  const mils = awgDiameterMm(awg) / 0.0254;
  return (mils * mils) / 1000;
}

export const kcmilToMm2 = (kcmil: number) => kcmil * MM2_PER_KCMIL;
export const mm2ToKcmil = (mm2: number) => mm2 / MM2_PER_KCMIL;

export interface ConductorInfo {
  label: string;
  areaMm2: number;
  areaKcmil: number;
  /** Solid-conductor diameter; stranded conductors are larger. Only for AWG. */
  solidDiameterMm?: number;
  /** Closest IEC metric size by area. */
  nearestMetricMm2: number;
  /** Smallest IEC metric size with at least this area. */
  nextLargerMetricMm2?: number;
}

export function conductorInfo(raw: string): ConductorInfo | { error: string } {
  const c = parseConductor(raw);
  if ("error" in c) return c;
  const areaKcmil = c.system === "AWG" ? awgAreaKcmil(c.awg) : c.kcmil;
  const areaMm2 = kcmilToMm2(areaKcmil);
  return {
    label: c.label,
    areaMm2,
    areaKcmil,
    solidDiameterMm: c.system === "AWG" ? awgDiameterMm(c.awg) : undefined,
    ...metricNeighbours(areaMm2),
  };
}

function metricNeighbours(areaMm2: number) {
  const nearestMetricMm2 = METRIC_SIZES_MM2.reduce((best, m) =>
    Math.abs(Math.log(m / areaMm2)) < Math.abs(Math.log(best / areaMm2)) ? m : best,
  );
  // Tiny tolerance so an exact match (to rounding) counts as "at least".
  const nextLargerMetricMm2 = METRIC_SIZES_MM2.find((m) => m >= areaMm2 * 0.999);
  return { nearestMetricMm2, nextLargerMetricMm2 };
}

interface NaSize {
  /** "12 AWG", "1/0 AWG", "250 kcmil". */
  label: string;
  areaMm2: number;
}

/** Standard AWG/kcmil sizes, smallest to largest. 18 and 16 AWG are control and fixture wire. */
export const NA_WIRE_SIZES: NaSize[] = [
  "18", "16", "14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0",
  "250 kcmil", "300 kcmil", "350 kcmil", "400 kcmil", "500 kcmil", "600 kcmil", "700 kcmil", "750 kcmil", "800 kcmil", "900 kcmil",
  "1000 kcmil", "1250 kcmil", "1500 kcmil", "1750 kcmil", "2000 kcmil",
].map((s) => {
  const c = conductorInfo(s);
  if ("error" in c) throw new Error(`Bad wire size ${s}`);
  return { label: c.label, areaMm2: c.areaMm2 };
});

/** Building wire: what a branch circuit or feeder can be, so 14 AWG and up. */
export const NA_BUILDING_SIZES = NA_WIRE_SIZES.slice(2);

/** Metric -> North American: nearest size by area, and the smallest size at least as large. */
export function metricToNorthAmerican(mm2: number): { nearest: NaSize; nextLarger?: NaSize } {
  const nearest = NA_WIRE_SIZES.reduce((best, s) =>
    Math.abs(Math.log(s.areaMm2 / mm2)) < Math.abs(Math.log(best.areaMm2 / mm2)) ? s : best,
  );
  return { nearest, nextLarger: NA_WIRE_SIZES.find((s) => s.areaMm2 >= mm2 * 0.999) };
}

// ---------- Conductor weight ----------

export type Metal = "Cu" | "Al";

/** g/cm³: annealed copper (IACS) and 1350 aluminum. */
const METAL_DENSITY: Record<Metal, number> = { Cu: 8.89, Al: 2.705 };

/**
 * Bare conductor mass per km (1 mm² × 1 km = 1000 cm³, so kg/km = mm² × g/cm³).
 * Solid conductor, no insulation; stranding adds roughly 2%.
 */
export const conductorKgPerKm = (areaMm2: number, metal: Metal) => areaMm2 * METAL_DENSITY[metal];
export const kgPerKmToLbPerKft = (kgPerKm: number) => kgPerKm * LB_PER_KG * M_PER_FT;

// ---------- Conductor resistance and voltage drop ----------

/**
 * Resistivity at 20 °C (Ω·mm²/m) and its temperature coefficient: annealed copper at 100%
 * IACS (1/58) and 1350 aluminum at 61% IACS.
 */
const RESISTIVITY_20C: Record<Metal, { rho: number; alpha: number }> = {
  Cu: { rho: 1 / 58, alpha: 0.00393 },
  Al: { rho: 0.028264, alpha: 0.00403 },
};

/** Which standard a size belongs to: AWG/kcmil is a geometric area, IEC 60228 a resistance limit. */
type SizeSystem = "na" | "iec";

/** Stranded conductors run about 2% over solid: the lay makes each strand longer (NEC Chapter 9 Table 8). */
const STRANDING = 1.02;

/**
 * IEC 60228 maximum DC resistance at 20 °C, Ω/km: class 2 stranded, plain copper and aluminum (class 2
 * aluminum starts at 10 mm²). An IEC size is defined by this limit, so working from its nominal
 * area reads 5-7% low.
 */
const IEC_R20: Record<Metal, Record<number, number>> = {
  Cu: {
    0.5: 36, 0.75: 24.5, 1: 18.1, 1.5: 12.1, 2.5: 7.41, 4: 4.61, 6: 3.08, 10: 1.83, 16: 1.15, 25: 0.727, 35: 0.524, 50: 0.387, 70: 0.268,
    95: 0.193, 120: 0.153, 150: 0.124, 185: 0.0991, 240: 0.0754, 300: 0.0601, 400: 0.047, 500: 0.0366, 630: 0.0283, 800: 0.0221, 1000: 0.0176,
  },
  Al: {
    10: 3.08, 16: 1.91, 25: 1.2, 35: 0.868, 50: 0.641, 70: 0.443, 95: 0.32, 120: 0.253, 150: 0.206, 185: 0.164, 240: 0.125, 300: 0.1, 400: 0.0778,
    500: 0.0605, 630: 0.0469, 800: 0.0367, 1000: 0.0291,
  },
};
/** An area IEC doesn't list: the typical gap between nominal geometry and the IEC limit. */
const IEC_UNLISTED = 1.07;

/** DC resistance per km of a stranded conductor at 75 °C, a usual design value. */
export function conductorOhmsPerKm(areaMm2: number, metal: Metal, system: SizeSystem): number {
  const { rho, alpha } = RESISTIVITY_20C[metal];
  const geometric = (rho / areaMm2) * 1000;
  const r20 = system === "na" ? geometric * STRANDING : (IEC_R20[metal][areaMm2] ?? geometric * IEC_UNLISTED);
  return r20 * (1 + alpha * (75 - 20));
}

/** "steel": steel conduit. "nonmetallic": PVC conduit, and a safe stand-in for cable, whose conductors sit closer. */
export type Raceway = "steel" | "nonmetallic";

/**
 * NEC Chapter 9 Table 9, Ω/km at 60 Hz and 75 °C, three single conductors in one conduit:
 * [size, X PVC, X steel, R copper PVC, R copper steel, R aluminum PVC, R aluminum steel].
 * The table stops at 1000 kcmil; larger sizes take its last row. It has no 14 AWG aluminum: 0 here.
 */
const TABLE_9: [string, number, number, number, number, number, number][] = [
  ["14", 0.19, 0.24, 10.2, 10.2, 0, 0],
  ["12", 0.177, 0.223, 6.6, 6.6, 10.5, 10.5],
  ["10", 0.164, 0.207, 3.9, 3.9, 6.6, 6.6],
  ["8", 0.171, 0.213, 2.56, 2.56, 4.3, 4.3],
  ["6", 0.167, 0.21, 1.61, 1.61, 2.66, 2.66],
  ["4", 0.157, 0.197, 1.02, 1.02, 1.67, 1.67],
  ["3", 0.154, 0.194, 0.82, 0.82, 1.31, 1.31],
  ["2", 0.148, 0.187, 0.62, 0.66, 1.05, 1.05],
  ["1", 0.151, 0.187, 0.49, 0.52, 0.82, 0.82],
  ["1/0", 0.144, 0.18, 0.39, 0.39, 0.66, 0.66],
  ["2/0", 0.141, 0.177, 0.33, 0.33, 0.52, 0.52],
  ["3/0", 0.138, 0.171, 0.253, 0.259, 0.43, 0.43],
  ["4/0", 0.135, 0.167, 0.203, 0.207, 0.33, 0.33],
  ["250 kcmil", 0.135, 0.171, 0.171, 0.177, 0.279, 0.282],
  ["300 kcmil", 0.135, 0.167, 0.144, 0.148, 0.233, 0.236],
  ["350 kcmil", 0.131, 0.164, 0.125, 0.128, 0.2, 0.207],
  ["400 kcmil", 0.131, 0.161, 0.108, 0.115, 0.177, 0.18],
  ["500 kcmil", 0.128, 0.157, 0.089, 0.095, 0.141, 0.148],
  ["600 kcmil", 0.128, 0.157, 0.075, 0.082, 0.118, 0.125],
  ["750 kcmil", 0.125, 0.157, 0.062, 0.069, 0.095, 0.102],
  ["1000 kcmil", 0.121, 0.151, 0.049, 0.059, 0.075, 0.082],
];

/** Each Table 9 row as reactance and AC ÷ DC resistance, so any size can be read between rows. */
const AC_ROWS = TABLE_9.map(([size, xPvc, xSteel, rCuPvc, rCuSteel, rAlPvc, rAlSteel]) => {
  const c = conductorInfo(size);
  if ("error" in c) throw new Error(`Bad Table 9 size ${size}`);
  // Table 9 rounds small sizes to two figures, which can land under DC: skin effect never does.
  const factor = (r: number, metal: Metal) => Math.max(1, r / conductorOhmsPerKm(c.areaMm2, metal, "na"));
  return {
    logArea: Math.log(c.areaMm2),
    x: { nonmetallic: xPvc, steel: xSteel },
    ac: {
      Cu: { nonmetallic: factor(rCuPvc, "Cu"), steel: factor(rCuSteel, "Cu") },
      Al: { nonmetallic: factor(rAlPvc, "Al"), steel: factor(rAlSteel, "Al") },
    },
  };
});

/** A Table 9 column read at any area: straight between rows on log area, held flat past either end. */
function readTable9(areaMm2: number, column: (row: (typeof AC_ROWS)[number]) => number): number {
  const at = Math.log(areaMm2);
  const upper = AC_ROWS.findIndex((r) => r.logArea >= at);
  if (upper === 0) return column(AC_ROWS[0]);
  if (upper === -1) return column(AC_ROWS[AC_ROWS.length - 1]);
  const [a, b] = [AC_ROWS[upper - 1], AC_ROWS[upper]];
  return column(a) + ((at - a.logArea) / (b.logArea - a.logArea)) * (column(b) - column(a));
}

interface ConductorSetup {
  areaMm2: number;
  metal: Metal;
  system: SizeSystem;
  raceway: Raceway;
  hz: 50 | 60;
}

/** AC resistance and reactance, Ω/km at 75 °C. Reactance scales with frequency. */
export function conductorImpedance({ areaMm2, metal, system, raceway, hz }: ConductorSetup): { r: number; x: number } {
  return {
    r: conductorOhmsPerKm(areaMm2, metal, system) * readTable9(areaMm2, (row) => row.ac[metal][raceway]),
    x: readTable9(areaMm2, (row) => row.x[raceway]) * (hz / 60),
  };
}

interface VoltageDropInput extends ConductorSetup {
  /** One-way length of the run, metres. */
  lengthM: number;
  amps: number;
  volts: number;
  phase: Phase;
  /** Load power factor. Left out, the drop is the most any power factor could give. */
  pf?: number;
  /** Conductors in parallel per phase. */
  sets?: number;
}

/**
 * Voltage drop: 2·I·Z·L single-phase, √3·I·Z·L three-phase (line-to-line volts), with
 * Z = R·PF + X·sin φ. On large conductors X outweighs R, so a bigger wire stops helping and only
 * parallel sets do. With no PF, Z = √(R² + X²), the peak of that formula over every power factor.
 */
export function voltageDrop(i: VoltageDropInput): { volts: number; percent: number; atLoad: number } {
  const { r, x } = conductorImpedance(i);
  const z = i.pf === undefined ? Math.hypot(r, x) : r * i.pf + x * Math.sqrt(1 - i.pf ** 2);
  const k = i.phase === 3 ? Math.sqrt(3) : 2;
  const volts = (k * i.amps * (z / 1000) * i.lengthM) / (i.sets ?? 1);
  return { volts, percent: (volts / i.volts) * 100, atLoad: i.volts - volts };
}

/** Smallest size from a list (smallest first) that keeps the drop at or under `maxPercent`. Says nothing about ampacity. */
export function smallestSizeForDrop<T>(
  sizes: T[],
  areaOf: (size: T) => number,
  maxPercent: number,
  run: Omit<VoltageDropInput, "areaMm2">,
): T | undefined {
  return sizes.find((s) => voltageDrop({ ...run, areaMm2: areaOf(s) }).percent <= maxPercent + 1e-9);
}

/** Sizes a circuit can be run in. Aluminum building wire starts at 12 AWG. */
export const buildingSizesFor = (metal: Metal) => (metal === "Cu" ? NA_BUILDING_SIZES : NA_BUILDING_SIZES.slice(1));

/**
 * Metric sizes a circuit can be run in: 1.5 mm² copper, and aluminum from 10 mm², where IEC 60228
 * class 2 starts. National rules may allow smaller aluminum; this floor can only size up.
 */
export const metricSizesFor = (metal: Metal) => METRIC_SIZES_MM2.filter((m) => m >= (metal === "Cu" ? 1.5 : 10));
