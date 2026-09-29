// Counter-desk reference: conversions computed from standard definitions,
// not copied from code-book tables.

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

/** Standard AWG/kcmil sizes used in building wire, smallest to largest. */
export const NA_BUILDING_SIZES = [
  "18", "16", "14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0",
  "250 kcmil", "300 kcmil", "350 kcmil", "400 kcmil", "500 kcmil", "600 kcmil", "750 kcmil", "1000 kcmil",
];

/** Metric -> North American: nearest size by area, and the smallest size at least as large. */
export function metricToNorthAmerican(mm2: number): { nearest: string; nextLarger?: string } {
  const sized = NA_BUILDING_SIZES.map((label) => {
    const info = conductorInfo(label) as ConductorInfo;
    return { label: info.label, area: info.areaMm2 };
  });
  const nearest = sized.reduce((best, s) =>
    Math.abs(Math.log(s.area / mm2)) < Math.abs(Math.log(best.area / mm2)) ? s : best,
  );
  return { nearest: nearest.label, nextLarger: sized.find((s) => s.area >= mm2 * 0.999)?.label };
}

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

function inchValue(s: string): number | undefined {
  // "1-1/4", "1 1/4", "1/2", "1.25", "2"
  const m = /^(?:(\d+)[\s-])?(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : undefined;
}

/**
 * Look up a conduit size given either form: '1-1/4"', "1 1/4 in", "1.25",
 * "35", "M35", "35 mm". Bare numbers from 12 up are read as metric designators
 * (no conduit is 12 inches), smaller ones as inches.
 */
export function conduitSize(raw: string): { inch: string; metric: number } | { error: string } {
  let s = raw.trim().toLowerCase().replace(/(["″]|\s*(in|inch|inches)\.?)$/, "").trim();
  const metricMarked = /^m\s*\d+$/.test(s) || /\d\s*mm$/.test(s);
  s = s.replace(/^m\s*/, "").replace(/\s*mm$/, "").trim();

  if (metricMarked || (/^\d+$/.test(s) && Number(s) >= 12)) {
    const hit = CONDUIT_TRADE_SIZES.find((c) => c.metric === Number(s));
    return hit ?? { error: `No conduit trade size with metric designator ${s}` };
  }
  const v = inchValue(s);
  const hit = v === undefined ? undefined : CONDUIT_TRADE_SIZES.find((c) => Math.abs(inchValue(c.inch)! - v) < 1e-9);
  return hit ?? { error: `Not a standard conduit trade size: ${raw}` };
}

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

// ---------- Length ----------

export const FT_PER_M = 1 / 0.3048;
export const ftToM = (ft: number) => ft * 0.3048;
export const mToFt = (m: number) => m / 0.3048;
export const MM_PER_IN = 25.4;

// ---------- Knockouts ----------

/**
 * Typical knockout punch diameter (inches) for each conduit trade size. Unlike the rest of
 * this file this is a copied table, not a definition: punch makers differ by a few
 * thousandths. Source: American Fittings, "NEMA Recommended Hole and Drill Sizes for Trade
 * Dimension" (amftgs.com), which matches Greenlee's published punch sizes.
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

// ---------- Conductor weight ----------

export type Metal = "Cu" | "Al";

/** g/cm³: annealed copper (IACS) and 1350 aluminum. */
export const METAL_DENSITY: Record<Metal, number> = { Cu: 8.89, Al: 2.705 };

export const LB_PER_KG = 2.20462262185;

/**
 * Bare conductor mass per km (1 mm² × 1 km = 1000 cm³, so kg/km = mm² × g/cm³).
 * Solid conductor, no insulation; stranding adds roughly 2%.
 */
export const conductorKgPerKm = (areaMm2: number, metal: Metal) => areaMm2 * METAL_DENSITY[metal];
export const kgPerKmToLbPerKft = (kgPerKm: number) => kgPerKm * LB_PER_KG * 0.3048;

// ---------- Load: kVA, kW, amps ----------

export type Phase = 1 | 3;
const phaseFactor = (phase: Phase) => (phase === 3 ? Math.sqrt(3) : 1);

/** Line current for an apparent power. Three-phase uses line-to-line volts. */
export const kvaToAmps = (kva: number, volts: number, phase: Phase) => (kva * 1000) / (volts * phaseFactor(phase));
export const ampsToKva = (amps: number, volts: number, phase: Phase) => (amps * volts * phaseFactor(phase)) / 1000;

// ---------- Other unit factors (exact or defined values) ----------

/** Mechanical horsepower (550 ft·lbf/s). Output power only: says nothing about motor current. */
export const W_PER_HP = 745.69987158227022;
/** International Table BTU. */
export const BTUH_PER_W = 3.412141633127942;
/** 1 fc = 1 lm/ft² = 1 / 0.09290304 lx. */
export const LUX_PER_FC = 1 / 0.09290304;
/** 1 lbf·in = 4.4482216152605 N × 0.0254 m. */
export const NM_PER_LBF_IN = 4.4482216152605 * 0.0254;
export const CM3_PER_IN3 = 16.387064;

export const fToC = (f: number) => ((f - 32) * 5) / 9;
export const cToF = (c: number) => (c * 9) / 5 + 32;

// ---------- Price per length ----------

/** Wire price units by length, as metres per unit (C ft = 100 ft, M ft = 1000 ft). */
export type LengthPriceUnit = "ft" | "Cft" | "Mft" | "m" | "km";
export const METRES_PER_PRICE_UNIT: Record<LengthPriceUnit, number> = {
  ft: 0.3048,
  Cft: 30.48,
  Mft: 304.8,
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

// ---------- Fractions of an inch ----------

/** Accepts 1-23/32 (with or without an inch mark), "1 23/32", "23/32", "1.719", ".5 in". */
export function parseInches(raw: string): number | undefined {
  const s = raw.trim().toLowerCase().replace(/(["″]|\s*(in|inch|inches)\.?)$/, "").trim();
  const m = /^(?:(\d+)[\s-]+)?(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[3]) === 0 ? undefined : Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
  return /^(\d+(\.\d*)?|\.\d+)$/.test(s) ? Number(s) : undefined;
}

/** Nearest fraction with the given denominator, reduced: 1.71875 -> 1-23/32 inches. */
export function toFraction(inches: number, denominator = 64): { label: string; value: number; error: number } {
  const total = Math.round(inches * denominator);
  const whole = Math.floor(total / denominator);
  let num = total - whole * denominator;
  let den = denominator;
  while (num > 0 && num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  const frac = num === 0 ? "" : `${num}/${den}`;
  const label = (whole && frac ? `${whole}-${frac}` : whole ? `${whole}` : frac || "0") + '"';
  const value = total / denominator;
  return { label, value, error: value - inches };
}

// ---------- Line-to-line and line-to-neutral voltage ----------

export const lineToNeutral = (volts: number) => volts / Math.sqrt(3);
export const lineToLine = (volts: number) => volts * Math.sqrt(3);

export type Region = "us" | "ca" | "eu";

/** Common wye systems as [line-to-neutral, line-to-line], and where they're used. */
export const WYE_SYSTEMS: { ln: number; ll: number; regions: Region[] }[] = [
  { ln: 120, ll: 208, regions: ["us", "ca"] },
  { ln: 277, ll: 480, regions: ["us", "ca"] },
  { ln: 347, ll: 600, regions: ["ca"] },
  { ln: 230, ll: 400, regions: ["eu"] },
  { ln: 400, ll: 690, regions: ["eu"] },
  { ln: 2400, ll: 4160, regions: ["us", "ca"] },
  { ln: 7200, ll: 12470, regions: ["us", "ca"] },
  { ln: 14400, ll: 24940, regions: ["us", "ca"] },
];

/**
 * The standard wye system a voltage belongs to, within 2% (208 / √3 = 120.09). With a region,
 * only that region's systems count, so 400 V reads as 230/400 in Europe.
 */
export function wyeSystem(volts: number, region?: Region): [number, number] | undefined {
  const hit = WYE_SYSTEMS.filter((s) => !region || s.regions.includes(region)).find((s) =>
    [s.ln, s.ll].some((v) => Math.abs(volts / v - 1) <= 0.02),
  );
  return hit && [hit.ln, hit.ll];
}

// ---------- Ohm's law ----------

export interface Electrical {
  volts: number;
  amps: number;
  ohms: number;
  watts: number;
}

/** Any two of V, I, R, P give the other two (DC or purely resistive AC). */
export function ohmsLaw(known: Partial<Electrical>): Electrical | { error: string } {
  const { volts: V, amps: I, ohms: R, watts: P } = known;
  const given = [V, I, R, P].filter((x) => x !== undefined).length;
  if (given !== 2) return { error: "Enter exactly two values" };
  if (V !== undefined && I !== undefined) return { volts: V, amps: I, ohms: V / I, watts: V * I };
  if (V !== undefined && R !== undefined) return { volts: V, amps: V / R, ohms: R, watts: (V * V) / R };
  if (V !== undefined && P !== undefined) return { volts: V, amps: P / V, ohms: (V * V) / P, watts: P };
  if (I !== undefined && R !== undefined) return { volts: I * R, amps: I, ohms: R, watts: I * I * R };
  if (I !== undefined && P !== undefined) return { volts: P / I, amps: I, ohms: P / (I * I), watts: P };
  return { volts: Math.sqrt(P! * R!), amps: Math.sqrt(P! / R!), ohms: R!, watts: P! };
}

// ---------- Energy cost ----------

export function energyUse(watts: number, hoursPerDay: number, daysPerYear: number, pricePerKwh: number) {
  const kwhPerDay = (watts * hoursPerDay) / 1000;
  const kwhPerYear = kwhPerDay * daysPerYear;
  return { kwhPerDay, kwhPerYear, costPerDay: kwhPerDay * pricePerKwh, costPerYear: kwhPerYear * pricePerKwh };
}

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

// ---------- Power factor correction ----------

/** Capacitor kvar to raise a load's power factor: kW × (tan φ₁ − tan φ₂). */
export function pfCorrectionKvar(kw: number, fromPf: number, toPf: number): number {
  return kw * (Math.tan(Math.acos(fromPf)) - Math.tan(Math.acos(toPf)));
}

// ---------- Motors ----------

/** Synchronous speed, r/min: 120 × f ÷ poles. */
export const syncSpeedRpm = (hz: number, poles: number) => (120 * hz) / poles;

/** Slip as a fraction of synchronous speed. */
export const motorSlip = (syncRpm: number, ratedRpm: number) => (syncRpm - ratedRpm) / syncRpm;

/** Pole count whose synchronous speed is just above a nameplate speed (induction motors run slightly slow). */
export function polesForRpm(hz: number, ratedRpm: number): number | undefined {
  let poles: number | undefined;
  for (let p = 2; p <= 48 && syncSpeedRpm(hz, p) >= ratedRpm; p += 2) poles = p;
  return poles;
}

// ---------- Transformer fault current ----------

/**
 * Maximum symmetrical fault current at a transformer's secondary, assuming an infinite source
 * (utility impedance zero): full-load amps ÷ per-unit impedance. A worst case, not a study.
 */
export function transformerFaultAmps(kva: number, volts: number, phase: Phase, impedancePercent: number) {
  const fla = kvaToAmps(kva, volts, phase);
  return { fla, faultAmps: fla / (impedancePercent / 100) };
}
