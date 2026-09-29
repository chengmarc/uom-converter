import { describe, expect, it } from "vitest";
import { convertPrice, discountToMultiplier, marginToMarkup, markupToMargin, multiplierToDiscount, sellFromCostAtMargin, suspectUomMismatch, unitPrice, unitsToOrder } from "./pricing";

describe("pricing UOM", () => {
  it("converts between E, C and M", () => {
    expect(convertPrice(125, "C", "E")).toBeCloseTo(1.25);
    expect(convertPrice(0.45, "E", "M")).toBeCloseTo(450);
  });

  it("spots likely UOM mix-ups", () => {
    expect(suspectUomMismatch(1.25, 125)).toBe(100);
    expect(suspectUomMismatch(450, 0.46)).toBe(1000);
    expect(suspectUomMismatch(10, 12)).toBeUndefined();
  });
});

describe("list and multiplier", () => {
  it("turns discounts and chains into multipliers", () => {
    expect(discountToMultiplier("35")).toBeCloseTo(0.65);
    expect(discountToMultiplier("35%")).toBeCloseTo(0.65);
    expect(discountToMultiplier("50/10")).toBeCloseTo(0.45);
    expect(discountToMultiplier("50/10/5")).toBeCloseTo(0.4275);
    expect(multiplierToDiscount(0.4275)).toBeCloseTo(57.25);
    expect(discountToMultiplier("50/abc")).toHaveProperty("error");
    expect(discountToMultiplier("120")).toHaveProperty("error");
  });
});

describe("margin and markup", () => {
  it("converts both ways", () => {
    expect(marginToMarkup(0.25)).toBeCloseTo(1 / 3);
    expect(markupToMargin(0.5)).toBeCloseTo(1 / 3);
    expect(markupToMargin(marginToMarkup(0.22))).toBeCloseTo(0.22);
    expect(sellFromCostAtMargin(75, 0.25)).toBeCloseTo(100);
  });
});

describe("packs and put-ups", () => {
  it("rounds up to whole packs", () => {
    expect(unitsToOrder(250, 100)).toEqual({ units: 3, total: 300, over: 50 });
    expect(unitsToOrder(300, 100)).toEqual({ units: 3, total: 300, over: 0 });
    expect(unitsToOrder(0.3, 0.1)).toMatchObject({ units: 3 });
    expect(unitsToOrder(0, 100)).toEqual({ units: 0, total: 0, over: 0 });
  });
});

describe("unitPrice", () => {
  it("divides out price quantity and content units", () => {
    expect(unitPrice(45, 100)).toEqual({ perOrderUnit: 0.45, perContentUnit: 0.45 });
    expect(unitPrice(125, 1, 100).perContentUnit).toBeCloseTo(1.25);
    expect(unitPrice(250, 10, 25)).toEqual({ perOrderUnit: 25, perContentUnit: 1 });
  });
});
