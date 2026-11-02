import { describe, expect, it } from "vitest";
import { cToF, feetInchesLabel, fToC, LUX_PER_FC, NM_PER_LBF_IN, parseFeetInches, parseInches, toFraction } from "@uom/core/units";

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

describe("feet and inches", () => {
  it("reads lengths as plans and tapes write them", () => {
    expect(parseFeetInches(`12'-6"`)).toBeCloseTo(12.5);
    expect(parseFeetInches(`12' 6"`)).toBeCloseTo(12.5);
    expect(parseFeetInches(`12'6`)).toBeCloseTo(12.5);
    expect(parseFeetInches(`12'-6 1/2"`)).toBeCloseTo(12 + 6.5 / 12);
    expect(parseFeetInches(`12'-6-1/2"`)).toBeCloseTo(12 + 6.5 / 12);
    expect(parseFeetInches("12 ft 6 in")).toBeCloseTo(12.5);
    expect(parseFeetInches(`6"`)).toBeCloseTo(0.5);
    expect(parseFeetInches("12'")).toBe(12);
    expect(parseFeetInches("10 ft")).toBe(10);
  });

  it("leaves a plain number alone, and refuses what it can't read", () => {
    expect(parseFeetInches("12")).toBeUndefined();
    expect(parseFeetInches("12.5")).toBeUndefined();
    expect(parseFeetInches("abc'")).toBeUndefined();
    expect(parseFeetInches(`12'-x"`)).toBeUndefined();
  });

  it("writes feet the same way, to the nearest 1/16", () => {
    expect(feetInchesLabel(12.5)).toBe(`12'-6"`);
    expect(feetInchesLabel(12 + 6.5 / 12)).toBe(`12'-6 1/2"`);
    expect(feetInchesLabel(0.5)).toBe(`0'-6"`);
    expect(feetInchesLabel(10)).toBe(`10'-0"`);
    expect(feetInchesLabel(9.9999)).toBe(`10'-0"`);
  });
});
