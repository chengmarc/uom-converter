import { describe, expect, it } from "vitest";
import { ampsToKva, energyUse, highLegVolts, kvaToAmps, lineToLine, lineToNeutral, motorSlip, ohmsLaw, pfCorrectionKvar, polesForRpm, readingBand, resistiveAt, supplyRange, syncSpeedRpm, transformerFaultAmps, wyeSystem } from "./electrical";

describe("load", () => {
  it("converts kVA and amps", () => {
    expect(kvaToAmps(75, 208, 3)).toBeCloseTo(208.2, 1);
    expect(kvaToAmps(45, 600, 3)).toBeCloseTo(43.3, 1);
    expect(kvaToAmps(10, 240, 1)).toBeCloseTo(41.67, 2);
    expect(ampsToKva(kvaToAmps(112.5, 480, 3), 480, 3)).toBeCloseTo(112.5);
  });
});

describe("line and neutral voltage", () => {
  it("converts between line-to-line and line-to-neutral", () => {
    expect(lineToNeutral(208)).toBeCloseTo(120.09, 2);
    expect(lineToNeutral(600)).toBeCloseTo(346.4, 1);
    expect(lineToLine(277)).toBeCloseTo(479.8, 1);
  });

  it("finds the wye system a voltage belongs to", () => {
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

  it("matches only the side that was measured", () => {
    expect(wyeSystem(400, "eu", "ln")).toEqual([400, 690]);
    expect(wyeSystem(400, "eu", "ll")).toEqual([230, 400]);
    expect(wyeSystem(208, "us", "ln")).toBeUndefined();
    expect(wyeSystem(120, "us", "ll")).toBeUndefined();
  });
});

describe("high-leg delta", () => {
  it("is 208 V to neutral on a 240 V delta", () => {
    expect(highLegVolts(240)).toBeCloseTo(207.8, 1);
  });
});

describe("supply voltage limits", () => {
  it("matches published ANSI C84.1 service voltages", () => {
    const us = (n: number) => supplyRange(n, "us")!;
    expect(us(120).normal).toEqual([expect.closeTo(114), expect.closeTo(126)]);
    expect(us(120).extreme).toEqual([expect.closeTo(110), expect.closeTo(127)]);
    expect(us(240).extreme).toEqual([expect.closeTo(220), expect.closeTo(254)]);
    expect(us(480).normal).toEqual([expect.closeTo(456), expect.closeTo(504)]);
    expect(us(480).extreme).toEqual([expect.closeTo(440), expect.closeTo(508)]);
  });

  it("holds 120/208 V tighter than 120/240 V in Canada, as CSA C235 does", () => {
    expect(supplyRange(120, "ca")).toEqual({ normal: [112, 125], extreme: [110, 127] });
    expect(supplyRange(120, "ca", true)).toEqual({ normal: [110, 125], extreme: [106, 127] });
    expect(supplyRange(240, "ca")).toEqual({ normal: [220, 250], extreme: [212, 254] });
    expect(supplyRange(208, "ca")).toEqual({ normal: [194, 216], extreme: [190, 220] });
    expect(supplyRange(600, "ca")).toEqual({ normal: [550, 625], extreme: [530, 635] });
  });

  it("gives Europe ±10% and no second band", () => {
    const r = supplyRange(230, "eu")!;
    expect(r.normal).toEqual([expect.closeTo(207), expect.closeTo(253)]);
    expect(r.extreme).toEqual(r.normal);
  });

  it("has no limits for a nominal the region doesn't use", () => {
    expect(supplyRange(230, "us")).toBeUndefined();
    expect(supplyRange(480, "ca")).toBeUndefined();
    expect(supplyRange(120, "eu")).toBeUndefined();
  });

  it("places a reading in the limits", () => {
    const r = supplyRange(120, "ca", true)!;
    expect(readingBand(118, r)).toBe("normal");
    expect(readingBand(110, r)).toBe("normal");
    expect(readingBand(108, r)).toBe("extreme");
    expect(readingBand(104, r)).toBe("outside");
    expect(readingBand(130, r)).toBe("outside");
  });
});

describe("a resistive load on another voltage", () => {
  it("follows the square of the voltage", () => {
    const r = resistiveAt(4800, 240, 208);
    expect(r.watts).toBeCloseTo(3605, 0);
    expect(r.share).toBeCloseTo(0.751, 3);
    expect(r.amps).toBeCloseTo(17.33, 2);
  });
});

describe("power factor correction", () => {
  it("sizes the capacitor", () => {
    expect(pfCorrectionKvar(100, 0.8, 0.95)).toBeCloseTo(42.13, 2);
    expect(pfCorrectionKvar(100, 0.9, 0.9)).toBeCloseTo(0);
  });
});

describe("motors", () => {
  it("works out synchronous speed from frequency and poles", () => {
    expect(syncSpeedRpm(60, 4)).toBe(1800);
    expect(syncSpeedRpm(50, 4)).toBe(1500);
  });

  it("works out slip from synchronous and rated speed", () => {
    expect(motorSlip(1800, 1750)).toBeCloseTo(0.0278, 4);
  });

  it("finds the poles from a nameplate speed", () => {
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

  it("takes the impedance tolerance and motors in the worst case", () => {
    const r = transformerFaultAmps(1000, 480, 3, 5.75);
    expect(r.worstCase).toBeCloseTo(r.faultAmps / 0.9);
    const withMotors = transformerFaultAmps(1000, 480, 3, 5.75, 600);
    expect(withMotors.motorContribution).toBe(2400);
    expect(withMotors.worstCase).toBeCloseTo(r.worstCase + 2400);
  });

  it("gives line-to-neutral at a centre-tapped secondary", () => {
    const r = transformerFaultAmps(50, 240, 1, 2);
    expect(r.lineToNeutral).toBeCloseTo(r.worstCase * 1.5);
  });
});

describe("Ohm's law", () => {
  // One circuit, 120 V × 10 A through 12 Ω = 1200 W: any two of its values give back all four.
  const circuit = { volts: 120, amps: 10, ohms: 12, watts: 1200 };
  const pairs = [
    ["volts", "amps"],
    ["volts", "ohms"],
    ["volts", "watts"],
    ["amps", "ohms"],
    ["amps", "watts"],
    ["ohms", "watts"],
  ] as const;

  it.each(pairs)("solves from %s and %s", (a, b) => {
    expect(ohmsLaw({ [a]: circuit[a], [b]: circuit[b] })).toMatchObject({
      volts: expect.closeTo(120),
      amps: expect.closeTo(10),
      ohms: expect.closeTo(12),
      watts: expect.closeTo(1200),
    });
  });

  it("needs exactly two values", () => {
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
