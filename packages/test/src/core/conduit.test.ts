import { describe, expect, it } from "vitest";
import { CONDUIT_TRADE_SIZES, conduitSize, euConduitSize, KNOCKOUT_PUNCH_IN } from "@uom/core/conduit";

describe("conduit trade sizes", () => {
  it("converts both ways, however it's written", () => {
    for (const s of ['1-1/4"', "1 1/4", "1-1/4 in", "1.25"]) {
      expect(conduitSize(s), s).toEqual({ inch: "1-1/4", metric: 35, typed: "inch" });
    }
    for (const s of ["35", "M35", "35 mm"]) {
      expect(conduitSize(s), s).toEqual({ inch: "1-1/4", metric: 35, typed: "metric" });
    }
    expect(conduitSize("3/4")).toMatchObject({ inch: "3/4", metric: 21 });
    expect(conduitSize("1")).toMatchObject({ inch: "1", metric: 27, typed: "inch" });
    expect(conduitSize("4")).toMatchObject({ inch: "4", metric: 103 });
  });

  it("rejects non-standard sizes", () => {
    expect(conduitSize("7")).toHaveProperty("error");
    expect(conduitSize("30")).toHaveProperty("error");
  });
});

describe("European conduit", () => {
  it("reads M sizes as outside diameters, with the typical clearance hole", () => {
    expect(euConduitSize("M32")).toEqual({ size: 32, holeMm: 32.5 });
    expect(euConduitSize("m 20")).toEqual({ size: 20, holeMm: 20.5 });
  });

  it("refuses M sizes Europe doesn't have, and leaves other input alone", () => {
    expect(euConduitSize("M35")).toHaveProperty("error");
    expect(euConduitSize('1-1/4"')).toBeUndefined();
    expect(euConduitSize("16")).toBeUndefined();
  });
});

describe("knockouts", () => {
  it("has a punch size for every conduit size from 1/2 to 4", () => {
    const covered = CONDUIT_TRADE_SIZES.filter((c) => c.inch !== "3/8" && !["5", "6"].includes(c.inch));
    for (const c of covered) expect(KNOCKOUT_PUNCH_IN[c.inch], c.inch).toBeGreaterThan(0);
    expect(KNOCKOUT_PUNCH_IN["1/2"]).toBeCloseTo(7 / 8, 1);
  });
});
