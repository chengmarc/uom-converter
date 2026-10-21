import { describe, expect, it } from "vitest";
import { cToF, fToC, LUX_PER_FC, NM_PER_LBF_IN, parseInches, toFraction } from "./units";

describe("unit factors", () => {
  // These two are worked out from their definitions (1 fc = 1 lm/ft², 1 lbf·in = 4.448… N × 0.0254 m).
  it("derive to their published values", () => {
    expect(LUX_PER_FC).toBeCloseTo(10.764, 3);
    expect(NM_PER_LBF_IN).toBeCloseTo(0.113, 3);
  });
});

describe("temperature", () => {
  it("converts °F and °C both ways", () => {
    expect(fToC(167)).toBeCloseTo(75);
    expect(cToF(90)).toBeCloseTo(194);
    expect(fToC(cToF(-40))).toBeCloseTo(-40);
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
