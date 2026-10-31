// Electrical formulas: load (kVA, kW, amps), line and neutral voltage, Ohm's law, energy cost,
// power factor correction, motors and transformer fault current.

import { ratingAtLeast, ratingAtMost } from "./ratings";
import type { Region } from "./region";
import { t } from "@uom/i18n";

// ---------- Load: kVA, kW, amps ----------

export type Phase = 1 | 3;
const phaseFactor = (phase: Phase) => (phase === 3 ? Math.sqrt(3) : 1);

/** Line current for an apparent power. Three-phase uses line-to-line volts. */
export const kvaToAmps = (kva: number, volts: number, phase: Phase) => (kva * 1000) / (volts * phaseFactor(phase));
export const ampsToKva = (amps: number, volts: number, phase: Phase) => (amps * volts * phaseFactor(phase)) / 1000;

// ---------- Line-to-line and line-to-neutral voltage ----------

export const lineToNeutral = (volts: number) => volts / Math.sqrt(3);
export const lineToLine = (volts: number) => volts * Math.sqrt(3);

/** Common wye systems as [line-to-neutral, line-to-line], and where they're used. */
const WYE_SYSTEMS: { ln: number; ll: number; regions: Region[] }[] = [
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
 * only that region's systems count, so 400 V reads as 230/400 in Europe. With a side, the voltage
 * must be that side of the system: 400 V line-to-neutral is 400/690, not 230/400.
 */
export function wyeSystem(volts: number, region?: Region, side?: "ll" | "ln"): [number, number] | undefined {
  const hit = WYE_SYSTEMS.filter((s) => !region || s.regions.includes(region)).find((s) =>
    (side ? [s[side]] : [s.ln, s.ll]).some((v) => Math.abs(volts / v - 1) <= 0.02),
  );
  return hit && [hit.ln, hit.ll];
}

/**
 * A centre-tapped delta (120/240 V): each leg of the tapped side is half the line-to-line voltage
 * from neutral, and the third, the high leg, is √3 ÷ 2 of it, 208 V on a 240 V delta.
 */
export const highLegVolts = (lineToLine: number) => (lineToLine * Math.sqrt(3)) / 2;

// ---------- Supply voltage limits ----------

type Limits = [low: number, high: number];

/** Limits for a nominal voltage: within `normal` needs no action, within `extreme` should be corrected. */
interface SupplyRange {
  normal: Limits;
  extreme: Limits;
}

const of = (nominal: number, low: number, high: number): Limits => [nominal * low, nominal * high];

/** CSA CAN3-C235-83 at the service entrance, by system: 120/208 V is held tighter than 120/240 V. */
const CA_120_240: Record<number, SupplyRange> = {
  120: { normal: [110, 125], extreme: [106, 127] },
  240: { normal: [220, 250], extreme: [212, 254] },
};
const CA_RANGES: Record<number, SupplyRange> = {
  ...CA_120_240,
  120: { normal: [112, 125], extreme: [110, 127] },
  208: { normal: [194, 216], extreme: [190, 220] },
  347: { normal: [318, 360], extreme: [306, 367] },
  600: { normal: [550, 625], extreme: [530, 635] },
};

/** ANSI C84.1 service voltages, which are the same fractions at every nominal: Range A, then B. */
const US_NOMINALS = [120, 208, 240, 277, 480, 600];
const usRange = (nominal: number): SupplyRange => ({ normal: of(nominal, 0.95, 1.05), extreme: of(nominal, 110 / 120, 127 / 120) });

/** EN 50160: ±10% at the supply terminals, with no second band. */
const EU_NOMINALS = [230, 400];
const euRange = (nominal: number): SupplyRange => ({ normal: of(nominal, 0.9, 1.1), extreme: of(nominal, 0.9, 1.1) });

/**
 * The supply limits for a nominal voltage, at the service. `splitPhase` is a single-phase 120/240 V
 * supply, where 120 V is that system and not the 120 V leg of a 120/208 V wye. Undefined for a
 * nominal the region doesn't list.
 */
export function supplyRange(nominal: number, region: Region, splitPhase = false): SupplyRange | undefined {
  if (region === "ca") return (splitPhase ? CA_120_240 : CA_RANGES)[nominal];
  if (region === "us") return US_NOMINALS.includes(nominal) ? usRange(nominal) : undefined;
  return EU_NOMINALS.includes(nominal) ? euRange(nominal) : undefined;
}

/** Where a reading falls in those limits. */
export function readingBand(reading: number, range: SupplyRange): "normal" | "extreme" | "outside" {
  const within = ([low, high]: Limits) => reading >= low && reading <= high;
  return within(range.normal) ? "normal" : within(range.extreme) ? "extreme" : "outside";
}

// ---------- Ohm's law ----------

interface Electrical {
  volts: number;
  amps: number;
  ohms: number;
  watts: number;
}

/** Any two of V, I, R, P give the other two (DC or purely resistive AC). */
export function ohmsLaw(known: Partial<Electrical>): Electrical | { error: string } {
  const { volts: V, amps: I, ohms: R, watts: P } = known;
  const given = [V, I, R, P].filter((x) => x !== undefined).length;
  if (given !== 2) return { error: t("Enter exactly two values") };
  if (V !== undefined && I !== undefined) return { volts: V, amps: I, ohms: V / I, watts: V * I };
  if (V !== undefined && R !== undefined) return { volts: V, amps: V / R, ohms: R, watts: (V * V) / R };
  if (V !== undefined && P !== undefined) return { volts: V, amps: P / V, ohms: (V * V) / P, watts: P };
  if (I !== undefined && R !== undefined) return { volts: I * R, amps: I, ohms: R, watts: I * I * R };
  if (I !== undefined && P !== undefined) return { volts: P / I, amps: I, ohms: P / (I * I), watts: P };
  return { volts: Math.sqrt(P! * R!), amps: Math.sqrt(P! / R!), ohms: R!, watts: P! };
}

/**
 * A resistive load off its rated voltage: resistance holds, so power follows the square of the
 * voltage. A 240 V heater on 208 V gives 75% of its rating.
 */
export function resistiveAt(ratedWatts: number, ratedVolts: number, volts: number) {
  const watts = ratedWatts * (volts / ratedVolts) ** 2;
  return { watts, amps: watts / volts, share: watts / ratedWatts };
}

// ---------- Energy cost ----------

export function energyUse(watts: number, hoursPerDay: number, daysPerYear: number, pricePerKwh: number) {
  const kwhPerDay = (watts * hoursPerDay) / 1000;
  const kwhPerYear = kwhPerDay * daysPerYear;
  return { kwhPerDay, kwhPerYear, costPerDay: kwhPerDay * pricePerKwh, costPerYear: kwhPerYear * pricePerKwh };
}

// ---------- Power factor correction ----------

/** Capacitor kvar to raise a load's power factor: kW × (tan φ₁ − tan φ₂). */
export function pfCorrectionKvar(kw: number, fromPf: number, toPf: number): number {
  return kw * (Math.tan(Math.acos(fromPf)) - Math.tan(Math.acos(toPf)));
}

/**
 * What a capacitor gives off its rated voltage: kvar follows the square of the voltage, so a 600 V
 * unit on 480 V gives 64%. Returns the rated kvar to buy for `kvar` at `volts`.
 */
export const capacitorRatedKvar = (kvar: number, volts: number, ratedVolts: number) => kvar * (ratedVolts / volts) ** 2;

// ---------- Photovoltaics ----------

/**
 * A string's voltage on the coldest day (NEC 690.7): Voc rises as temperature falls below the
 * 25 °C it's rated at. `coefficient` is the data sheet's %/°C, a negative number.
 */
export function pvStringVolts(voc: number, modules: number, coefficient: number, lowC: number, limit: number) {
  const coldVoc = voc * (1 + (coefficient / 100) * (lowC - 25));
  return { coldVoc, stringVolts: coldVoc * modules, maxModules: Math.floor(limit / coldVoc + 1e-9) };
}

/** NEC 690.8: maximum circuit current is 125% of Isc, and conductors carry 125% of that again, 156% in all. */
export function pvCircuitAmps(isc: number, strings: number) {
  const circuit = isc * strings * 1.25;
  return { circuit, ampacity: circuit * 1.25 };
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

// ---------- Transformers ----------

/** Dry-type sizes commonly stocked, kVA. */
const TRANSFORMER_KVA: Record<Phase, number[]> = {
  1: [1, 1.5, 2, 3, 5, 7.5, 10, 15, 25, 37.5, 50, 75, 100, 167],
  3: [3, 6, 9, 15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000],
};

/** The next common size up. Undefined past the end of the list. */
export const nextTransformerKva = (kva: number, phase: Phase) => TRANSFORMER_KVA[phase].find((k) => k >= kva);

/** Standard ratings for a percentage: the next size up where the code allows it, the next down where it doesn't. */
const device = (amps: number, roundUp: boolean) => (roundUp ? ratingAtLeast(amps) : ratingAtMost(amps));

/**
 * Overcurrent protection for a transformer of 600 V or less. NEC Table 450.3(B), primary only:
 * 125% from 9 A (next size up), 167% from 2 A, 300% under that (neither rounded up). With secondary
 * protection, the primary may reach 250% and the secondary sits at 125%, or 167% under 9 A.
 */
export function necTransformerProtection(primaryAmps: number, secondaryAmps: number) {
  const primaryOnly = primaryAmps >= 9 ? device(primaryAmps * 1.25, true) : primaryAmps >= 2 ? device(primaryAmps * 1.67, false) : device(primaryAmps * 3, false);
  return {
    primaryOnly,
    primaryWithSecondary: device(primaryAmps * 2.5, false),
    secondary: secondaryAmps >= 9 ? device(secondaryAmps * 1.25, true) : device(secondaryAmps * 1.67, false),
  };
}

/** A dry-type transformer of 750 V or less under the CEC: the primary at 125%, the next size up where it falls between. */
export const cecTransformerPrimary = (primaryAmps: number) => device(primaryAmps * 1.25, true);

/** Real impedance can sit this far under the nameplate: ±10% is the UL 1561 tolerance from 25 kVA up. */
const Z_TOLERANCE = 0.9;
/** Running motors feed a fault: 4 × their full-load amps is the usual estimate (4 to 6 is accepted). */
const MOTOR_CONTRIBUTION = 4;
/** A centre-tapped single-phase secondary: line-to-neutral at the terminals, against line-to-line. */
const CENTRE_TAP_LN = 1.5;

/**
 * Symmetrical fault current at a transformer's secondary, assuming an infinite source (utility
 * impedance zero): full-load amps ÷ per-unit impedance. `worstCase` also takes the impedance
 * tolerance and any motor contribution, and is what to hold interrupting ratings against.
 */
export function transformerFaultAmps(kva: number, volts: number, phase: Phase, impedancePercent: number, motorAmps = 0) {
  const fla = kvaToAmps(kva, volts, phase);
  const faultAmps = fla / (impedancePercent / 100);
  const atTolerance = faultAmps / Z_TOLERANCE;
  const motorContribution = motorAmps * MOTOR_CONTRIBUTION;
  return { fla, faultAmps, motorContribution, worstCase: atTolerance + motorContribution, lineToNeutral: atTolerance * CENTRE_TAP_LN + motorContribution };
}
