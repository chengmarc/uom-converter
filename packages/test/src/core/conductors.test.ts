import { describe, expect, it } from "vitest";
import { buildingSizesFor, conductorImpedance, conductorInfo, faultAtEndOfRun, conductorKgPerKm, conductorOhmsPerKm, kgPerKmToLbPerKft, metricSizesFor, metricToNorthAmerican, NA_BUILDING_SIZES, parseConductor, smallestSizeForDrop, voltageDrop, type ConductorInfo } from "@uom/core/conductors";

const info = (s: string) => conductorInfo(s) as ConductorInfo;

describe("conductor sizes", () => {
  it("matches published AWG values", () => {
    // Reference values from the ASTM B258 AWG definition, as widely published.
    expect(info("12").areaMm2).toBeCloseTo(3.31, 2);
    expect(info("12").solidDiameterMm).toBeCloseTo(2.053, 3);
    expect(info("12").areaKcmil).toBeCloseTo(6.53, 2);
    expect(info("1/0").areaMm2).toBeCloseTo(53.5, 1);
    expect(info("4/0").areaKcmil).toBeCloseTo(211.6, 1);
  });

  it("reads MCM as kcmil", () => {
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
    expect(parseConductor("0 kcmil")).toHaveProperty("error");
  });

  it("keeps control and fixture wire out of the building sizes", () => {
    expect(NA_BUILDING_SIZES[0].label).toBe("14 AWG");
    expect(buildingSizesFor("Al")[0].label).toBe("12 AWG");
    expect(NA_BUILDING_SIZES.map((s) => s.label)).toContain("700 kcmil");
    expect(NA_BUILDING_SIZES.at(-1)?.label).toBe("2000 kcmil");
    expect(metricSizesFor("Cu")[0]).toBe(1.5);
    expect(metricSizesFor("Al")[0]).toBe(10);
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
  /** Ω per 1,000 ft, as NEC Chapter 9 prints them. */
  const dcPerKft = (size: string, metal: "Cu" | "Al" = "Cu") => conductorOhmsPerKm(info(size).areaMm2, metal, "na") * 0.3048;
  const inConduit = (size: string, raceway: "steel" | "nonmetallic") => {
    const { r, x } = conductorImpedance({ areaMm2: info(size).areaMm2, metal: "Cu", system: "na", raceway, hz: 60 });
    return { r: r * 0.3048, x: x * 0.3048 };
  };
  const setup = { metal: "Cu" as const, system: "na" as const, raceway: "steel" as const, hz: 60 as const };

  it("matches NEC Chapter 9 Table 8 (stranded, 75 °C)", () => {
    expect(dcPerKft("12") / 1.98).toBeCloseTo(1, 1);
    expect(dcPerKft("10") / 1.24).toBeCloseTo(1, 1);
    expect(dcPerKft("1/0") / 0.122).toBeCloseTo(1, 1);
    expect(dcPerKft("500 kcmil") / 0.0258).toBeCloseTo(1, 1);
    expect(dcPerKft("4/0", "Al") / 0.1).toBeCloseTo(1, 1);
  });

  it("uses the IEC 60228 limit for metric sizes, not their nominal area", () => {
    const at20 = (r75: number, alpha: number) => r75 / (1 + alpha * 55);
    expect(at20(conductorOhmsPerKm(2.5, "Cu", "iec"), 0.00393)).toBeCloseTo(7.41, 2);
    expect(at20(conductorOhmsPerKm(25, "Al", "iec"), 0.00403)).toBeCloseTo(1.2, 2);
    // An area IEC doesn't list still gets a resistance.
    expect(conductorOhmsPerKm(3, "Cu", "iec")).toBeGreaterThan(conductorOhmsPerKm(4, "Cu", "iec"));
  });

  it("matches NEC Chapter 9 Table 9 (steel conduit, 60 Hz)", () => {
    expect(inConduit("12", "steel").x).toBeCloseTo(0.068, 3);
    expect(inConduit("1/0", "steel").x).toBeCloseTo(0.055, 3);
    expect(inConduit("500 kcmil", "steel").x).toBeCloseTo(0.048, 3);
    expect(inConduit("250 kcmil", "steel").r).toBeCloseTo(0.054, 3);
    expect(inConduit("500 kcmil", "steel").r).toBeCloseTo(0.029, 3);
  });

  it("matches NEC Chapter 9 Table 9 (PVC conduit)", () => {
    expect(inConduit("500 kcmil", "nonmetallic").x).toBeCloseTo(0.039, 3);
    expect(inConduit("500 kcmil", "nonmetallic").r).toBeCloseTo(0.027, 3);
  });

  it("scales reactance with frequency", () => {
    const at = (hz: 50 | 60) => conductorImpedance({ ...setup, areaMm2: 120, hz }).x;
    expect(at(50) / at(60)).toBeCloseTo(50 / 60);
  });

  it("reads Table 9 between rows and holds past its ends", () => {
    const x = (size: string) => inConduit(size, "steel").x;
    expect(x("700 kcmil")).toBeCloseTo(0.048, 3);
    expect(x("2000 kcmil")).toBe(x("1000 kcmil"));
    expect(x("18")).toBe(x("14"));
  });

  it("works out single- and three-phase drop", () => {
    // 500 kcmil in steel, PF 0.85: Z = 0.050 Ω/kft (Table 9's effective Z).
    const feeder = { ...setup, areaMm2: info("500 kcmil").areaMm2, pf: 0.85, lengthM: 91.44, amps: 380, volts: 480, phase: 3 as const };
    expect(voltageDrop(feeder).volts).toBeCloseTo(Math.sqrt(3) * 380 * 0.05 * 0.3, 0);
    const one = voltageDrop({ ...feeder, phase: 1 });
    expect(one.volts / voltageDrop(feeder).volts).toBeCloseTo(2 / Math.sqrt(3));
  });

  it("shares the drop between parallel sets", () => {
    const run = { ...setup, areaMm2: info("500 kcmil").areaMm2, lengthM: 100, amps: 800, volts: 480, phase: 3 as const };
    expect(voltageDrop({ ...run, sets: 2 }).volts).toBeCloseTo(voltageDrop(run).volts / 2);
  });

  it("gives the most any power factor could when none is set", () => {
    const run = { ...setup, areaMm2: info("500 kcmil").areaMm2, lengthM: 100, amps: 100, volts: 480, phase: 3 as const };
    const worst = voltageDrop(run).volts;
    for (const pf of [0.5, 0.7, 0.85, 0.95, 1]) expect(voltageDrop({ ...run, pf }).volts).toBeLessThan(worst);
  });

  it("stops a bigger wire curing a drop that reactance sets", () => {
    const run = { ...setup, pf: 0.85, lengthM: 152.4, amps: 450, volts: 208, phase: 3 as const };
    expect(smallestSizeForDrop(NA_BUILDING_SIZES, (s) => s.areaMm2, 3, run)).toBeUndefined();
    expect(smallestSizeForDrop(NA_BUILDING_SIZES, (s) => s.areaMm2, 3, { ...run, sets: 3 })).toBeDefined();
  });

  it("reads resistance colder when asked", () => {
    const at = (tempC?: number) => conductorImpedance({ ...setup, areaMm2: info("500 kcmil").areaMm2, tempC }).r;
    expect(at(20) / at()).toBeCloseTo(1 / (1 + 0.00393 * 55));
  });

  it("works out fault current at the end of a run", () => {
    const run = { ...setup, areaMm2: info("500 kcmil").areaMm2, lengthM: 30.48, faultAmps: 20000, volts: 480, phase: 3 as const, sets: 1 };
    const r = faultAtEndOfRun(run);
    expect(r.multiplier).toBeCloseTo(1 / (1 + r.f));
    expect(r.faultAmps).toBeLessThan(20000);
    expect(faultAtEndOfRun({ ...run, sets: 2 }).faultAmps).toBeGreaterThan(r.faultAmps);
    expect(faultAtEndOfRun({ ...run, lengthM: 300 }).faultAmps).toBeLessThan(r.faultAmps);
  });

  it("finds the smallest size for a target drop", () => {
    const run = { ...setup, lengthM: 30.48, amps: 16, volts: 120, phase: 1 as const };
    const size = smallestSizeForDrop(NA_BUILDING_SIZES, (s) => s.areaMm2, 3, run);
    expect(size?.label).toBe("8 AWG"); // 10 AWG gives 3.3%, 8 AWG 2.1%
    expect(smallestSizeForDrop(["14"], (s) => info(s).areaMm2, 3, run)).toBeUndefined();
  });
});
