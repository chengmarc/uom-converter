import { describe, expect, it } from "vitest";
import { conductorInfo, conductorKgPerKm, conductorOhmsPerKm, kcmilToMm2, kgPerKmToLbPerKft, metricToNorthAmerican, NA_BUILDING_SIZES, parseConductor, smallestSizeForDrop, voltageDrop, type ConductorInfo } from "./conductors";
import { CONDUIT_TRADE_SIZES, conduitSize, KNOCKOUT_PUNCH_IN } from "./conduit";
import { ampsToKva, energyUse, kvaToAmps, lineToLine, lineToNeutral, motorSlip, ohmsLaw, pfCorrectionKvar, polesForRpm, syncSpeedRpm, transformerFaultAmps, wyeSystem } from "./electrical";
import { convertPrice, discountToMultiplier, marginToMarkup, markupToMargin, multiplierToDiscount, sellFromCostAtMargin, suspectUomMismatch, unitsToOrder } from "./pricing";
import { BTUH_PER_W, cToF, fToC, ftToM, LUX_PER_FC, NM_PER_LBF_IN, parseInches, toFraction, W_PER_HP } from "./units";

const info = (s: string) => conductorInfo(s) as ConductorInfo;

describe("conductor sizes", () => {
  it("matches published AWG values", () => {
    // Reference values from the ASTM B258 AWG definition, as widely published.
    expect(info("14").areaMm2).toBeCloseTo(2.08, 2);
    expect(info("12").areaMm2).toBeCloseTo(3.31, 2);
    expect(info("12").solidDiameterMm).toBeCloseTo(2.053, 3);
    expect(info("12").areaKcmil).toBeCloseTo(6.53, 2);
    expect(info("10").areaMm2).toBeCloseTo(5.26, 2);
    expect(info("1/0").areaMm2).toBeCloseTo(53.5, 1);
    expect(info("4/0").areaKcmil).toBeCloseTo(211.6, 1);
    expect(info("4/0").areaMm2).toBeCloseTo(107.2, 1);
  });

  it("converts kcmil", () => {
    expect(kcmilToMm2(250)).toBeCloseTo(126.7, 1);
    expect(info("500 MCM").areaMm2).toBeCloseTo(253.4, 1);
  });

  it("parses the ways people write sizes", () => {
    expect(parseConductor("#12")).toMatchObject({ awg: 12 });
    expect(parseConductor("12 AWG")).toMatchObject({ awg: 12 });
    expect(parseConductor("2/0")).toMatchObject({ awg: -1, label: "2/0 AWG" });
    expect(parseConductor("000")).toMatchObject({ awg: -2, label: "3/0 AWG" });
    expect(parseConductor("350 kcmil")).toMatchObject({ kcmil: 350 });
    expect(parseConductor("5/0")).toHaveProperty("error");
    expect(parseConductor("wire")).toHaveProperty("error");
  });

  it("finds metric neighbours", () => {
    expect(info("12")).toMatchObject({ nearestMetricMm2: 4, nextLargerMetricMm2: 4 });
    expect(info("1/0")).toMatchObject({ nearestMetricMm2: 50, nextLargerMetricMm2: 70 });
  });

  it("goes metric to North American", () => {
    expect(metricToNorthAmerican(2.5)).toEqual({ nearest: "14 AWG", nextLarger: "12 AWG" });
    expect(metricToNorthAmerican(120)).toEqual({ nearest: "250 kcmil", nextLarger: "250 kcmil" });
  });
});

describe("conduit trade sizes", () => {
  it("converts both ways, however it's written", () => {
    for (const s of ['1-1/4"', "1 1/4", "1-1/4 in", "1.25", "35", "M35", "35 mm"]) {
      expect(conduitSize(s), s).toEqual({ inch: "1-1/4", metric: 35 });
    }
    expect(conduitSize("3/4")).toEqual({ inch: "3/4", metric: 21 });
    expect(conduitSize("1")).toEqual({ inch: "1", metric: 27 });
    expect(conduitSize("4")).toEqual({ inch: "4", metric: 103 });
  });

  it("rejects non-standard sizes", () => {
    expect(conduitSize("7")).toHaveProperty("error");
    expect(conduitSize("30")).toHaveProperty("error");
  });
});

describe("pricing UOM", () => {
  it("converts between E, C and M", () => {
    expect(convertPrice(125, "C", "E")).toBeCloseTo(1.25);
    expect(convertPrice(0.45, "E", "M")).toBeCloseTo(450);
  });

  it("spots likely UOM mix-ups", () => {
    expect(suspectUomMismatch(1.25, 125)).toBe(100);
    expect(suspectUomMismatch(450, 0.46)).toBe(1000);
    expect(suspectUomMismatch(10, 12)).toBeUndefined();
  });
});

describe("length", () => {
  it("converts feet to metres", () => {
    expect(ftToM(1000)).toBeCloseTo(304.8);
  });
});

describe("knockouts", () => {
  it("has a punch size for every conduit size from 1/2 to 4", () => {
    const covered = CONDUIT_TRADE_SIZES.filter((c) => c.inch !== "3/8" && !["5", "6"].includes(c.inch));
    for (const c of covered) expect(KNOCKOUT_PUNCH_IN[c.inch], c.inch).toBeGreaterThan(0);
    expect(KNOCKOUT_PUNCH_IN["1/2"]).toBeCloseTo(7 / 8, 1);
  });
});

describe("packs and put-ups", () => {
  it("rounds up to whole packs", () => {
    expect(unitsToOrder(250, 100)).toEqual({ units: 3, total: 300, over: 50 });
    expect(unitsToOrder(300, 100)).toEqual({ units: 3, total: 300, over: 0 });
    expect(unitsToOrder(0.3, 0.1)).toMatchObject({ units: 3 });
    expect(unitsToOrder(0, 100)).toEqual({ units: 0, total: 0, over: 0 });
  });
});

describe("conductor weight", () => {
  it("matches published bare copper weights", () => {
    // Solid bare copper, lb per 1000 ft, as published in wire tables.
    expect(kgPerKmToLbPerKft(conductorKgPerKm(info("12").areaMm2, "Cu"))).toBeCloseTo(19.8, 1);
    expect(kgPerKmToLbPerKft(conductorKgPerKm(info("4/0").areaMm2, "Cu"))).toBeCloseTo(640.5, 0);
  });

  it("is lighter in aluminum", () => {
    expect(conductorKgPerKm(100, "Al") / conductorKgPerKm(100, "Cu")).toBeCloseTo(0.304, 3);
  });
});

describe("load", () => {
  it("converts kVA and amps", () => {
    expect(kvaToAmps(75, 208, 3)).toBeCloseTo(208.2, 1);
    expect(kvaToAmps(45, 600, 3)).toBeCloseTo(43.3, 1);
    expect(kvaToAmps(10, 240, 1)).toBeCloseTo(41.67, 2);
    expect(ampsToKva(kvaToAmps(112.5, 480, 3), 480, 3)).toBeCloseTo(112.5);
  });
});

describe("unit factors", () => {
  it("uses the defined values", () => {
    expect(W_PER_HP).toBeCloseTo(745.7, 1);
    expect(BTUH_PER_W * 1000).toBeCloseTo(3412.14, 2);
    expect(LUX_PER_FC).toBeCloseTo(10.764, 3);
    expect(NM_PER_LBF_IN).toBeCloseTo(0.113, 3);
    expect(fToC(167)).toBeCloseTo(75);
    expect(cToF(90)).toBeCloseTo(194);
    expect(fToC(cToF(-40))).toBeCloseTo(-40);
  });
});

describe("list and multiplier", () => {
  it("turns discounts and chains into multipliers", () => {
    expect(discountToMultiplier("35")).toBeCloseTo(0.65);
    expect(discountToMultiplier("35%")).toBeCloseTo(0.65);
    expect(discountToMultiplier("50/10")).toBeCloseTo(0.45);
    expect(discountToMultiplier("50/10/5")).toBeCloseTo(0.4275);
    expect(multiplierToDiscount(0.4275)).toBeCloseTo(57.25);
    expect(discountToMultiplier("50/abc")).toHaveProperty("error");
    expect(discountToMultiplier("120")).toHaveProperty("error");
  });
});

describe("margin and markup", () => {
  it("converts both ways", () => {
    expect(marginToMarkup(0.25)).toBeCloseTo(1 / 3);
    expect(markupToMargin(0.5)).toBeCloseTo(1 / 3);
    expect(markupToMargin(marginToMarkup(0.22))).toBeCloseTo(0.22);
    expect(sellFromCostAtMargin(75, 0.25)).toBeCloseTo(100);
  });
});

describe("fractions of an inch", () => {
  it("parses the ways people write inches", () => {
    expect(parseInches('1-23/32"')).toBeCloseTo(1.71875);
    expect(parseInches("1 23/32 in")).toBeCloseTo(1.71875);
    expect(parseInches("7/8")).toBeCloseTo(0.875);
    expect(parseInches(".5")).toBe(0.5);
    expect(parseInches("1/0")).toBeUndefined();
    expect(parseInches("abc")).toBeUndefined();
  });

  it("finds the nearest reduced fraction", () => {
    expect(toFraction(1.71875).label).toBe('1-23/32"');
    expect(toFraction(0.885).label).toBe('57/64"');
    expect(toFraction(0.5).label).toBe('1/2"');
    expect(toFraction(2).label).toBe('2"');
    expect(toFraction(0.001).label).toBe('0"');
    expect(toFraction(0.885).error).toBeCloseTo(57 / 64 - 0.885, 6);
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

describe("conductor resistance and voltage drop", () => {
  it("matches NEC Chapter 9 Table 8 (solid, uncoated copper, 75 °C)", () => {
    const perKft = (awg: string, metal: "Cu" | "Al" = "Cu") => conductorOhmsPerKm(info(awg).areaMm2, metal) * 0.3048;
    expect(perKft("12")).toBeCloseTo(1.93, 2);
    expect(perKft("14")).toBeCloseTo(3.07, 2);
    expect(perKft("10")).toBeCloseTo(1.21, 2);
  });

  it("works out single- and three-phase drop", () => {
    // 12 AWG Cu, 100 ft one way, 16 A at 120 V single-phase: 2 × 16 × 1.9316 Ω/kft × 0.1 kft ≈ 6.18 V.
    const one = voltageDrop({ areaMm2: info("12").areaMm2, metal: "Cu", lengthM: 30.48, amps: 16, volts: 120, phase: 1 });
    expect(one.volts).toBeCloseTo(6.18, 2);
    expect(one.percent).toBeCloseTo(5.15, 2);
    const three = voltageDrop({ areaMm2: 35, metal: "Cu", lengthM: 50, amps: 100, volts: 400, phase: 3 });
    expect(three.volts).toBeCloseTo(Math.sqrt(3) * 100 * (conductorOhmsPerKm(35, "Cu") / 1000) * 50, 6);
  });

  it("finds the smallest size for a target drop", () => {
    const run = { metal: "Cu" as const, lengthM: 30.48, amps: 16, volts: 120, phase: 1 as const };
    const size = smallestSizeForDrop(NA_BUILDING_SIZES, (s) => info(s).areaMm2, 3, run);
    expect(size).toBe("8"); // 10 AWG gives 3.26%, 8 AWG 2.05%
    expect(smallestSizeForDrop(["14"], (s) => info(s).areaMm2, 3, run)).toBeUndefined();
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
