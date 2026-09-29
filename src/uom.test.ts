import { describe, expect, it } from "vitest";
import { unitPrice } from "./pricing";
import { lookupUom, toMetric, UOM_CODES, type MetricValue } from "./uom";

const metric = (s: string) => toMetric(s) as MetricValue;

describe("UOM codes", () => {
  it("has unique codes and aliases", () => {
    const codes = UOM_CODES.map((u) => u.code);
    expect(new Set(codes).size).toBe(codes.length);
    const aliases = UOM_CODES.flatMap((u) => u.aliases.map((a) => a.toLowerCase()));
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it("finds units however they're written", () => {
    expect(lookupUom("EA")?.code).toBe("EA");
    expect(lookupUom("pcs")?.code).toBe("H87");
    expect(lookupUom("ft")?.code).toBe("FOT");
    expect(lookupUom("feet")?.code).toBe("FOT");
    expect(lookupUom("Meter")?.code).toBe("MTR");
    expect(lookupUom("lbs")?.code).toBe("LBR");
    expect(lookupUom("in-lb")?.code).toBe("F21");
    expect(lookupUom("hp")?.code).toBe("BHP");
  });

  it("maps package codes to the X-prefixed Rec 21 form", () => {
    expect(lookupUom("BX")?.code).toBe("XBX");
    expect(lookupUom("box")?.code).toBe("XBX");
    expect(lookupUom("RL")?.code).toBe("XRL");
    expect(lookupUom("CS")?.code).toBe("XCS");
    expect(lookupUom("xpk")?.code).toBe("XPK");
  });

  it("prefers exact codes over aliases", () => {
    expect(lookupUom("C")?.code).toBe("CEN");
    expect(lookupUom("M")?.code).toBe("MIL");
    expect(lookupUom("m")?.code).toBe("MTR"); // SI symbol; upper-case M is the pricing thousand
    expect(lookupUom("nothing")).toBeUndefined();
    expect(lookupUom("")).toBeUndefined();
  });
});

describe("toMetric", () => {
  it("converts wire sizes to mm²", () => {
    expect(metric("12 AWG")).toMatchObject({ unit: "mm²", code: "MMK", readAs: "12 AWG" });
    expect(metric("12 AWG").value).toBeCloseTo(3.31, 2);
    expect(metric("#12").value).toBeCloseTo(3.31, 2);
    expect(metric("4/0").value).toBeCloseTo(107.2, 1);
    expect(metric("250 kcmil").value).toBeCloseTo(126.7, 1);
  });

  it("converts inches, including fractions", () => {
    expect(metric('3/4"').value).toBeCloseTo(19.05);
    expect(metric("1-1/4 in")).toMatchObject({ unit: "mm", code: "MMT" });
    expect(metric("1-1/4 in").value).toBeCloseTo(31.75);
    expect(metric("1 1/4 inch").value).toBeCloseTo(31.75);
    expect(metric("0.5in").value).toBeCloseTo(12.7);
  });

  it("converts the other imperial units", () => {
    expect(metric("1000 ft")).toMatchObject({ unit: "m", code: "MTR" });
    expect(metric("1000 ft").value).toBeCloseTo(304.8);
    expect(metric("167 °F").value).toBeCloseTo(75);
    expect(metric("-40 F").value).toBeCloseTo(-40);
    expect(metric("2.2 lbs").value).toBeCloseTo(0.998, 3);
    expect(metric("35 lb-in")).toMatchObject({ unit: "N·m", code: "NU" });
    expect(metric("35 lb-in").value).toBeCloseTo(3.95, 2);
    expect(metric("50 ft-lb").value).toBeCloseTo(67.79, 2);
    expect(metric("1 hp").value).toBeCloseTo(0.7457, 4);
    expect(metric("50 fc").value).toBeCloseTo(538.2, 1);
  });

  it("passes metric through, tidied", () => {
    expect(metric("25 mm")).toMatchObject({ value: 25, unit: "mm" });
    expect(metric("2.5 cm")).toMatchObject({ value: 25, unit: "mm" });
    expect(metric("2.5 mm2")).toMatchObject({ value: 2.5, unit: "mm²" });
    expect(metric("90 °C")).toMatchObject({ value: 90, unit: "°C" });
  });

  it("refuses what it can't read", () => {
    expect(toMetric("12")).toHaveProperty("error");
    expect(toMetric("12 furlongs")).toHaveProperty("error");
    expect(toMetric("red")).toHaveProperty("error");
    expect(toMetric("7/0")).toHaveProperty("error");
  });
});

describe("unitPrice", () => {
  it("divides out price quantity and content units", () => {
    expect(unitPrice(45, 100)).toEqual({ perOrderUnit: 0.45, perContentUnit: 0.45 });
    expect(unitPrice(125, 1, 100).perContentUnit).toBeCloseTo(1.25);
    expect(unitPrice(250, 10, 25)).toEqual({ perOrderUnit: 25, perContentUnit: 1 });
  });
});
