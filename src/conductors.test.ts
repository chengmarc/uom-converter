import { describe, expect, it } from "vitest";
import { conductorInfo, conductorKgPerKm, conductorOhmsPerKm, kcmilToMm2, kgPerKmToLbPerKft, metricToNorthAmerican, NA_BUILDING_SIZES, parseConductor, smallestSizeForDrop, voltageDrop, type ConductorInfo } from "./conductors";

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
    expect(metricToNorthAmerican(2.5)).toMatchObject({ nearest: { label: "14 AWG" }, nextLarger: { label: "12 AWG" } });
    expect(metricToNorthAmerican(120)).toMatchObject({ nearest: { label: "250 kcmil" }, nextLarger: { label: "250 kcmil" } });
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
    const size = smallestSizeForDrop(NA_BUILDING_SIZES, (s) => s.areaMm2, 3, run);
    expect(size?.label).toBe("8 AWG"); // 10 AWG gives 3.26%, 8 AWG 2.05%
    expect(smallestSizeForDrop(["14"], (s) => info(s).areaMm2, 3, run)).toBeUndefined();
  });
});
