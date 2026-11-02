import { describe, expect, it } from "vitest";
import { conductorAmpacity, smallestSizeForAmps } from "@uom/core/ampacity";

const standard = { metal: "Cu" as const, insulation: 90 as const, ambientC: 30, conductors: 3, code: "nec" as const };

describe("conductor ampacity", () => {
  it("reads NEC Table 310.16 at the insulation rating", () => {
    expect(conductorAmpacity("12 AWG", standard)?.table).toBe(30);
    expect(conductorAmpacity("750 kcmil", { ...standard, insulation: 75 })?.table).toBe(475);
    expect(conductorAmpacity("2000 kcmil", { ...standard, metal: "Al", insulation: 60 })?.table).toBe(470);
  });

  it("derates from the insulation rating, as the published 6 AWG example does", () => {
    // 65 A at 75 °C × 0.88 at 40 °C × 0.80 for six conductors ≈ 46 A.
    const a = conductorAmpacity("6 AWG", { ...standard, insulation: 75, ambientC: 40, conductors: 6 })!;
    expect(a.ambient).toBe(0.88);
    expect(a.bundling).toBe(0.8);
    expect(a.derated).toBeCloseTo(45.76);
  });

  it("takes 75 °C terminals above 1 AWG", () => {
    expect(conductorAmpacity("1 AWG", standard)?.terminal).toBe(60);
    expect(conductorAmpacity("1/0 AWG", standard)?.terminal).toBe(75);
  });

  it("holds small sizes to their overcurrent limit", () => {
    expect(conductorAmpacity("12 AWG", { ...standard, terminal: 90 })?.usable).toBe(20);
    expect(conductorAmpacity("12 AWG", { ...standard, metal: "Al", terminal: 90 })?.usable).toBe(15);
    expect(conductorAmpacity("12 AWG", { ...standard, terminal: 75, ignoreSmallLimit: true })?.usable).toBe(25);
  });

  it("counts bundles by each code's own bands", () => {
    const at = (code: "nec" | "cec", n: number) => conductorAmpacity("4/0 AWG", { ...standard, code, conductors: n })?.bundling;
    expect(at("nec", 3)).toBe(1);
    expect(at("nec", 9)).toBe(0.7);
    expect(at("nec", 12)).toBe(0.5);
    expect(at("cec", 12)).toBe(0.7);
    expect(at("cec", 43)).toBe(0.5);
  });

  it("has no rating where the insulation can't be used", () => {
    expect(conductorAmpacity("12 AWG", { ...standard, insulation: 60, ambientC: 58 })).toBeUndefined();
    expect(conductorAmpacity("12 AWG", { ...standard, ambientC: 90 })).toBeUndefined();
  });
});

describe("smallest size for a load", () => {
  it("has no answer past the table", () => {
    expect(smallestSizeForAmps(900, standard)).toBeUndefined();
  });
});
