import { describe, expect, it } from "vitest";
import { ampsToKva, energyUse, kvaToAmps, lineToLine, lineToNeutral, motorSlip, ohmsLaw, pfCorrectionKvar, polesForRpm, syncSpeedRpm, transformerFaultAmps, wyeSystem } from "./electrical";

describe("load", () => {
  it("converts kVA and amps", () => {
    expect(kvaToAmps(75, 208, 3)).toBeCloseTo(208.2, 1);
    expect(kvaToAmps(45, 600, 3)).toBeCloseTo(43.3, 1);
    expect(kvaToAmps(10, 240, 1)).toBeCloseTo(41.67, 2);
    expect(ampsToKva(kvaToAmps(112.5, 480, 3), 480, 3)).toBeCloseTo(112.5);
  });
});

describe("line and neutral voltage", () => {
  it("converts and finds the system", () => {
    expect(lineToNeutral(208)).toBeCloseTo(120.09, 2);
    expect(lineToNeutral(600)).toBeCloseTo(346.4, 1);
    expect(lineToLine(277)).toBeCloseTo(479.8, 1);
    expect(wyeSystem(208)).toEqual([120, 208]);
    expect(wyeSystem(346.4)).toEqual([347, 600]);
    expect(wyeSystem(240)).toBeUndefined();
  });

  it("uses the region's systems", () => {
    expect(wyeSystem(400, "eu")).toEqual([230, 400]);
    expect(wyeSystem(690, "eu")).toEqual([400, 690]);
    expect(wyeSystem(600, "us")).toBeUndefined();
    expect(wyeSystem(600, "ca")).toEqual([347, 600]);
  });
});

describe("power factor correction", () => {
  it("sizes the capacitor", () => {
    expect(pfCorrectionKvar(100, 0.8, 0.95)).toBeCloseTo(42.13, 2);
    expect(pfCorrectionKvar(100, 0.9, 0.9)).toBeCloseTo(0);
  });
});

describe("motors", () => {
  it("works out synchronous speed, slip and poles", () => {
    expect(syncSpeedRpm(60, 4)).toBe(1800);
    expect(syncSpeedRpm(50, 4)).toBe(1500);
    expect(motorSlip(1800, 1750)).toBeCloseTo(0.0278, 4);
    expect(polesForRpm(60, 1750)).toBe(4);
    expect(polesForRpm(60, 3550)).toBe(2);
    expect(polesForRpm(50, 1450)).toBe(4);
    expect(polesForRpm(60, 1800)).toBe(4);
    expect(polesForRpm(60, 4000)).toBeUndefined();
  });
});

describe("transformer fault current", () => {
  it("divides full-load amps by per-unit impedance", () => {
    const r = transformerFaultAmps(1000, 480, 3, 5.75);
    expect(r.fla).toBeCloseTo(1202.8, 1);
    expect(r.faultAmps).toBeCloseTo(20918, 0);
  });
});

describe("Ohm's law", () => {
  it("solves from any two", () => {
    const full = { volts: 120, amps: 10, ohms: 12, watts: 1200 };
    const keys = Object.keys(full) as (keyof typeof full)[];
    for (const a of keys) {
      for (const b of keys) {
        if (a >= b) continue;
        const r = ohmsLaw({ [a]: full[a], [b]: full[b] }) as typeof full;
        for (const k of keys) expect(r[k], `${a}+${b} -> ${k}`).toBeCloseTo(full[k]);
      }
    }
    expect(ohmsLaw({ volts: 120 })).toHaveProperty("error");
    expect(ohmsLaw({ volts: 120, amps: 1, ohms: 5 })).toHaveProperty("error");
  });
});

describe("energy cost", () => {
  it("works out kWh and cost", () => {
    const e = energyUse(1500, 8, 365, 0.15);
    expect(e.kwhPerDay).toBeCloseTo(12);
    expect(e.kwhPerYear).toBeCloseTo(4380);
    expect(e.costPerYear).toBeCloseTo(657);
  });
});
