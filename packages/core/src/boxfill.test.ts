import { describe, expect, it } from "vitest";
import { boxFill, CONDUCTOR_ALLOWANCE } from "./boxfill";
import { CM3_PER_IN3 } from "./units";

const empty = { devices: 0, studs: 0, clamps: false, grounds: 0, connectors: 0 };

describe("box fill", () => {
  it("has each code's own space per conductor", () => {
    expect(CONDUCTOR_ALLOWANCE.nec).toEqual({ "14": 2, "12": 2.25, "10": 2.5, "8": 3, "6": 5 });
    expect(CONDUCTOR_ALLOWANCE.cec).toEqual({ "14": 24.6, "12": 28.7, "10": 36.9, "8": 45.1, "6": 73.7 });
  });

  it("isn't one table in two units: the CEC allows less for the same wire", () => {
    expect(CONDUCTOR_ALLOWANCE.cec["14"]).toBeLessThan(CONDUCTOR_ALLOWANCE.nec["14"] * CM3_PER_IN3);
  });

  it("adds up each size of conductor", () => {
    expect(boxFill("nec", { ...empty, conductors: { "14": 4, "12": 2 } })?.total).toBeCloseTo(12.5);
    expect(boxFill("cec", { ...empty, conductors: { "14": 4 } })?.total).toBeCloseTo(98.4);
  });

  it("has nothing to size by with no conductors", () => {
    expect(boxFill("nec", { ...empty, conductors: {}, devices: 1 })).toBeUndefined();
  });

  it("counts a device as two of the largest conductor", () => {
    expect(boxFill("nec", { ...empty, conductors: { "14": 2, "12": 2 }, devices: 1 })?.others.devices).toBe(4.5);
    expect(boxFill("cec", { ...empty, conductors: { "14": 2 }, devices: 2 })?.others.devices).toBeCloseTo(98.4);
  });

  it("counts every clamp in the box as one, in the NEC only", () => {
    const set = { ...empty, conductors: { "14": 4 }, clamps: true };
    expect(boxFill("nec", set)?.others.clamps).toBe(2);
    expect(boxFill("cec", set)?.others.clamps).toBe(0);
  });

  it("counts up to four grounds as one, and a quarter each after that (NEC 2020)", () => {
    const grounds = (n: number) => boxFill("nec", { ...empty, conductors: { "12": 4 }, grounds: n })?.others.grounds;
    expect(grounds(0)).toBe(0);
    expect(grounds(1)).toBe(2.25);
    expect(grounds(4)).toBe(2.25);
    expect(grounds(8)).toBe(4.5);
  });

  it("leaves bare grounds out of the CEC count", () => {
    expect(boxFill("cec", { ...empty, conductors: { "14": 4 }, grounds: 3 })?.others.grounds).toBe(0);
  });

  it("counts wire connectors in pairs, in the CEC only", () => {
    const connectors = (code: "nec" | "cec", n: number) => boxFill(code, { ...empty, conductors: { "14": 4 }, connectors: n })?.others.connectors;
    expect(connectors("cec", 1)).toBe(0);
    expect(connectors("cec", 3)).toBe(24.6);
    expect(connectors("cec", 5)).toBe(49.2);
    expect(connectors("nec", 5)).toBe(0);
  });
});
