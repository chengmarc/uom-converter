import { describe, expect, it } from "vitest";
import { conduitFill } from "./conduitfill";

describe("conduit fill", () => {
  // The Steel Tube Institute's worked example.
  const mixed = [{ size: "12 AWG", count: 3 }, { size: "10 AWG", count: 4 }, { size: "8 AWG", count: 8 }];

  it("matches the published EMT example", () => {
    const f = conduitFill(mixed, "thhn", false);
    expect(f.area).toBeCloseTo(0.4171, 4);
    expect(f.smallest?.inch).toBe("1-1/4");
  });

  it("uses the limit for the conductor count", () => {
    expect(conduitFill([{ size: "12 AWG", count: 1 }], "thhn", false).limit).toBe(0.53);
    expect(conduitFill([{ size: "12 AWG", count: 2 }], "thhn", false).limit).toBe(0.31);
    expect(conduitFill(mixed, "thhn", false).limit).toBe(0.4);
    expect(conduitFill(mixed, "thhn", true).limit).toBe(0.6);
  });

  it("reads each insulation's own column", () => {
    expect(conduitFill([{ size: "14 AWG", count: 1 }], "xhhw", false).area).toBe(0.0139);
  });

  it("says how full a chosen size is", () => {
    expect(conduitFill(mixed, "thhn", false, "1").chosen?.fits).toBe(false);
    const f = conduitFill(mixed, "thhn", false, "1-1/4");
    expect(f.chosen?.fits).toBe(true);
    expect(f.chosen?.percent).toBeCloseTo(27.9, 1);
  });

  it("has no answer past 4 in", () => {
    expect(conduitFill([{ size: "500 kcmil", count: 20 }], "thhn", false).smallest).toBeUndefined();
  });
});
