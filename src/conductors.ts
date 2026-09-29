// Conductor sizes (AWG, kcmil, IEC mm²), weight, resistance and voltage drop, from definitions.

import type { Phase } from "./electrical";
import { LB_PER_KG, M_PER_FT } from "./units";

// ---------- Conductor sizes ----------

/** 1 kcmil in mm² (1 circular mil = π/4 × 0.0254² mm²). */
export const MM2_PER_KCMIL = (Math.PI / 4) * 0.0254 ** 2 * 1000;

/** IEC 60228 standard metric conductor sizes, mm². */
export const METRIC_SIZES_MM2 = [
  0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630, 800, 1000,
];

export type ConductorSize = { system: "AWG"; awg: number; label: string } | { system: "kcmil"; kcmil: number; label: string };

/**
 * Parse "12", "12 AWG", "#12", "1/0", "4/0", "250 kcmil", "250 MCM".
 * AWG n/0 is stored as 1 - n (1/0 = 0, 2/0 = -1, 3/0 = -2, 4/0 = -3), which is
 * what the AWG formula expects.
 */
export function parseConductor(raw: string): ConductorSize | { error: string } {
  const s = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s*awg$/, "").trim();
  const k = /^(\d+(?:\.\d+)?)\s*(kcmil|mcm)$/.exec(s);
  if (k) return { system: "kcmil", kcmil: Number(k[1]), label: `${k[1]} kcmil` };
  const zeros = /^([1-4])\/0$/.exec(s);
  if (zeros) return { system: "AWG", awg: 1 - Number(zeros[1]), label: `${zeros[1]}/0 AWG` };
  if (/^(0+)$/.test(s) && s.length <= 4) return { system: "AWG", awg: 1 - s.length, label: `${s.length}/0 AWG` };
  if (/^\d{1,2}$/.test(s) && Number(s) >= 1 && Number(s) <= 40) {
    return { system: "AWG", awg: Number(s), label: `${Number(s)} AWG` };
  }
  return { error: 'Use an AWG size ("12", "1/0", "4/0") or kcmil ("250 kcmil")' };
}

/** AWG definition: diameter = 0.005 in × 92^((36 - n) / 39). */
export function awgDiameterMm(awg: number): number {
  return 0.127 * 92 ** ((36 - awg) / 39);
}

export function awgAreaKcmil(awg: number): number {
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

export interface NaSize {
  /** "12 AWG", "1/0 AWG", "250 kcmil". */
  label: string;
  areaMm2: number;
}

/** Standard AWG/kcmil sizes used in building wire, smallest to largest. */
export const NA_BUILDING_SIZES: NaSize[] = [
  "18", "16", "14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0",
  "250 kcmil", "300 kcmil", "350 kcmil", "400 kcmil", "500 kcmil", "600 kcmil", "750 kcmil", "1000 kcmil",
].map((s) => {
  const c = conductorInfo(s);
  if ("error" in c) throw new Error(`Bad building-wire size ${s}`);
  return { label: c.label, areaMm2: c.areaMm2 };
});

/** Metric -> North American: nearest size by area, and the smallest size at least as large. */
export function metricToNorthAmerican(mm2: number): { nearest: NaSize; nextLarger?: NaSize } {
  const nearest = NA_BUILDING_SIZES.reduce((best, s) =>
    Math.abs(Math.log(s.areaMm2 / mm2)) < Math.abs(Math.log(best.areaMm2 / mm2)) ? s : best,
  );
  return { nearest, nextLarger: NA_BUILDING_SIZES.find((s) => s.areaMm2 >= mm2 * 0.999) };
}

// ---------- Conductor weight ----------

export type Metal = "Cu" | "Al";

/** g/cm³: annealed copper (IACS) and 1350 aluminum. */
export const METAL_DENSITY: Record<Metal, number> = { Cu: 8.89, Al: 2.705 };

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
export const RESISTIVITY_20C: Record<Metal, { rho: number; alpha: number }> = {
  Cu: { rho: 1 / 58, alpha: 0.00393 },
  Al: { rho: 0.028264, alpha: 0.00403 },
};

/** DC resistance per km of a solid conductor at a temperature (default 75 °C, a usual design value). */
export function conductorOhmsPerKm(areaMm2: number, metal: Metal, tempC = 75): number {
  const { rho, alpha } = RESISTIVITY_20C[metal];
  return ((rho * (1 + alpha * (tempC - 20))) / areaMm2) * 1000;
}

export interface VoltageDropInput {
  areaMm2: number;
  metal: Metal;
  /** One-way length of the run, metres. */
  lengthM: number;
  amps: number;
  volts: number;
  phase: Phase;
  tempC?: number;
}

/**
 * Voltage drop from DC resistance: 2·I·R·L single-phase, √3·I·R·L three-phase (line-to-line
 * volts). Ignores reactance, so it reads a little low for large conductors on AC.
 */
export function voltageDrop(i: VoltageDropInput): { volts: number; percent: number; atLoad: number } {
  const ohmsPerM = conductorOhmsPerKm(i.areaMm2, i.metal, i.tempC) / 1000;
  const k = i.phase === 3 ? Math.sqrt(3) : 2;
  const volts = k * i.amps * ohmsPerM * i.lengthM;
  return { volts, percent: (volts / i.volts) * 100, atLoad: i.volts - volts };
}

/** Smallest size from a list (smallest first) that keeps the drop at or under `maxPercent`. */
export function smallestSizeForDrop<T>(
  sizes: T[],
  areaOf: (size: T) => number,
  maxPercent: number,
  run: Omit<VoltageDropInput, "areaMm2">,
): T | undefined {
  return sizes.find((s) => voltageDrop({ ...run, areaMm2: areaOf(s) }).percent <= maxPercent + 1e-9);
}
