// Electrical formulas: load (kVA, kW, amps), line and neutral voltage, Ohm's law, energy cost,
// power factor correction, motors and transformer fault current.

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
