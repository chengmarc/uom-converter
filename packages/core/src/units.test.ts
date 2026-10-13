import { describe, expect, it } from "vitest";
import { BTUH_PER_W, cToF, fToC, ftToM, LUX_PER_FC, NM_PER_LBF_IN, parseInches, toFraction, W_PER_HP } from "./units";

describe("length", () => {
  it("converts feet to metres", () => {
    expect(ftToM(1000)).toBeCloseTo(304.8);
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
