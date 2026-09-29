import { describe, expect, it } from "vitest";
import { checkDigit, expandUpcE, makePackGtin14, parseGtin } from "./gtin";

describe("check digit", () => {
  it("matches published examples", () => {
    expect(checkDigit("03600029145")).toBe(2); // UPC-A 036000291452
    expect(checkDigit("400638133393")).toBe(1); // EAN-13 4006381333931
  });
});

describe("parseGtin", () => {
  it("accepts a UPC-A and derives every form", () => {
    const r = parseGtin("036000291452");
    expect(r.valid).toBe(true);
    expect(r.kind).toBe("UPC-A");
    expect(r.gtin14).toBe("00036000291452");
    expect(r.ean13).toBe("0036000291452");
    expect(r.upcA).toBe("036000291452");
  });

  it("accepts an EAN-13 with no UPC-A form", () => {
    const r = parseGtin("4006381333931");
    expect(r.valid).toBe(true);
    expect(r.upcA).toBeUndefined();
  });

  it("rejects a bad check digit and says what it should be", () => {
    const r = parseGtin("036000291453");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("expected 2");
  });

  it("cleans spreadsheet junk", () => {
    for (const s of ["'036000291452", "0-36000-29145-2", " 036000291452 ", "36000291452.0"]) {
      expect(parseGtin(s).gtin14, s).toBe("00036000291452");
    }
  });

  it("restores leading zeros stripped by Excel, with a warning", () => {
    const r = parseGtin("36000291452");
    expect(r.valid).toBe(true);
    expect(r.upcA).toBe("036000291452");
    expect(r.warnings[0]).toMatch(/leading zero/);
  });

  it("suggests a check digit for an 11-digit UPC body", () => {
    const r = parseGtin("03600029145");
    expect(r.valid).toBe(false);
    expect(r.suggestion).toBe("036000291452");
  });

  it("refuses Excel scientific notation", () => {
    const r = parseGtin("3.60003E+11");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/scientific notation/);
  });

  it("expands UPC-E by default and supports GTIN-8 mode", () => {
    const r = parseGtin("04252614");
    expect(r.kind).toBe("UPC-E");
    expect(r.upcA).toBe("042100005264");
    expect(parseGtin("04252614", { eightDigit: "gtin-8" }).kind).toBe("GTIN-8");
  });

  it("flags restricted-circulation and coupon prefixes", () => {
    const store = "2" + "0000012345";
    expect(parseGtin(store + checkDigit(store)).warnings[0]).toMatch(/Restricted/);
    const coupon = "5" + "0000012345";
    expect(parseGtin(coupon + checkDigit(coupon)).warnings[0]).toMatch(/Coupon/);
  });

  it("notes GS1 Canada prefixes", () => {
    const ca = "754000000001";
    expect(parseGtin(ca + checkDigit(ca)).notes.join()).toMatch(/GS1 Canada/);
  });

  it("rejects junk", () => {
    expect(parseGtin("ABC123").valid).toBe(false);
    expect(parseGtin("123456789012345").valid).toBe(false);
    expect(parseGtin("").valid).toBe(false);
  });
});

describe("UPC-E expansion rules", () => {
  it("handles each last-digit case", () => {
    expect(expandUpcE("04252614")).toBe("042100005264"); // d6 = 0-2 (Wikipedia example)
    expect(expandUpcE("01234531")).toBe("012300000451"); // d6 = 3
    expect(expandUpcE("01234541")).toBe("012340000051"); // d6 = 4
    expect(expandUpcE("01234571")).toBe("012345000071"); // d6 = 5-9
  });
});

describe("case/pack GTIN-14", () => {
  it("builds a pack GTIN and parses it back to the inner item", () => {
    const pack = makePackGtin14("036000291452", 1);
    expect(pack).toHaveLength(14);
    expect(pack[0]).toBe("1");
    const r = parseGtin(pack);
    expect(r.valid).toBe(true);
    expect(r.indicator).toBe(1);
    expect(r.likelyInnerItem).toBe("0036000291452");
  });

  it("rejects bad indicators", () => {
    expect(() => makePackGtin14("036000291452", 9)).toThrow();
  });
});
