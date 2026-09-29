// Electrical formulas: load (kVA, kW, amps), line and neutral voltage, Ohm's law, energy cost,
// power factor correction, motors and transformer fault current.

import type { Region } from "./region";

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
