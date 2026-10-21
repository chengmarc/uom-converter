import { beforeEach, describe, expect, it } from "vitest";
import { money, parseNumber, setNumberStyle } from "./format";
import { regionInfo } from "./regions";

describe("parseNumber, in the US", () => {
  beforeEach(() => setNumberStyle(regionInfo("us").number));

  it("reads thousands separators and a decimal point", () => {
    expect(parseNumber("1,250.50")).toBe(1250.5);
    expect(parseNumber("1,250,000")).toBe(1250000);
  });

  // "7,4" is someone used to decimal commas: reading it as 74 would be a silent tenfold error.
  it("refuses a comma that isn't between thousands", () => {
    expect(parseNumber("7,4")).toBeNaN();
    expect(parseNumber("12,50")).toBeNaN();
    expect(parseNumber("1,2345")).toBeNaN();
    expect(parseNumber(",500")).toBeNaN();
  });

  it("ignores currency symbols and spaces", () => {
    expect(parseNumber("$0.45")).toBe(0.45);
    expect(parseNumber("12 €")).toBe(12);
  });

  // undefined is "nothing typed yet" (no answer, no error); NaN is "can't read that" (an error).
  it("is undefined for an empty field", () => {
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber("  ")).toBeUndefined();
  });

  it("is NaN for anything that isn't a number", () => {
    expect(parseNumber("abc")).toBeNaN();
    expect(parseNumber("1.2.3")).toBeNaN();
  });

  it("takes a minus sign only in a signed field", () => {
    expect(parseNumber("-40")).toBeNaN();
    expect(parseNumber("-40", true)).toBe(-40);
  });
});

describe("parseNumber, in Europe", () => {
  beforeEach(() => setNumberStyle(regionInfo("eu").number));

  it("reads a decimal comma and dots between thousands", () => {
    expect(parseNumber("1.250,50")).toBe(1250.5);
    expect(parseNumber("7,4")).toBe(7.4);
  });

  // Spreadsheets and UK users write 1.5 everywhere.
  it("reads a dot as a decimal point when there's no comma", () => {
    expect(parseNumber("1.5")).toBe(1.5);
  });
});

describe("money", () => {
  it("keeps about six significant digits, and never fewer than 2 decimals", () => {
    setNumberStyle(regionInfo("us").number);
    expect(money(0.00123)).toBe("$0.00123");
    expect(money(1.47638)).toBe("$1.47638");
    expect(money(1476.38)).toBe("$1,476.38");
    expect(money(12.5)).toBe("$12.50");
  });

  it("puts the currency symbol after the number where the region does", () => {
    setNumberStyle(regionInfo("eu").number);
    expect(money(1476.38)).toBe("1.476,38 €");
  });
});
