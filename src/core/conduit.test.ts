import { describe, expect, it } from "vitest";
import { CONDUIT_TRADE_SIZES, conduitSize, KNOCKOUT_PUNCH_IN } from "./conduit";

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

describe("knockouts", () => {
  it("has a punch size for every conduit size from 1/2 to 4", () => {
    const covered = CONDUIT_TRADE_SIZES.filter((c) => c.inch !== "3/8" && !["5", "6"].includes(c.inch));
    for (const c of covered) expect(KNOCKOUT_PUNCH_IN[c.inch], c.inch).toBeGreaterThan(0);
    expect(KNOCKOUT_PUNCH_IN["1/2"]).toBeCloseTo(7 / 8, 1);
  });
});
