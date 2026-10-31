import { describe, expect, it } from "vitest";
import { cecDwelling, necDwelling } from "./dwelling";

const none = { range: 0, airConditioning: 0, heating: 0, hotLoads: 0, evCharger: 0, otherLoads: 0 };

describe("NEC optional method", () => {
  // EC&M's worked example: 1,500 ft², 22,600 VA of appliances, 10 kW of heat, 3,910 VA of A/C.
  const example = necDwelling({ ...none, area: 1500, otherLoads: 22600, heating: 10000, airConditioning: 3910 });

  it("matches the published dwelling", () => {
    expect(example.connected).toBe(31600);
    expect(example.general).toBe(18640);
    expect(example.hvac).toBe(6500);
    expect(example.watts).toBe(25140);
    expect(example.amps).toBeCloseTo(104.75, 2);
    expect(example.rating).toBe(110);
  });

  it("takes the larger of cooling and heat at 65%", () => {
    expect(necDwelling({ ...none, area: 1000, airConditioning: 8000, heating: 10000 }).hvac).toBe(8000);
  });

  it("is never under 100 A", () => {
    expect(necDwelling({ ...none, area: 500 }).rating).toBe(100);
  });
});

describe("CEC Rule 8-200", () => {
  it("adds 1,000 W for each 90 m², or part of it, over the first", () => {
    expect(cecDwelling({ ...none, area: 90 }, true, false).basic).toBe(5000);
    expect(cecDwelling({ ...none, area: 91 }, true, false).basic).toBe(6000);
    expect(cecDwelling({ ...none, area: 269 }, true, false).basic).toBe(7000);
  });

  it("takes the range at 6,000 W, and 40% over 12 kW", () => {
    expect(cecDwelling({ ...none, area: 100, range: 11000 }, true, false).range).toBe(6000);
    expect(cecDwelling({ ...none, area: 100, range: 14000 }, true, false).range).toBe(6800);
  });

  it("takes other loads at 25% with a range, and 100% to 6,000 W without", () => {
    expect(cecDwelling({ ...none, area: 100, range: 11000, otherLoads: 9500 }, true, false).other).toBe(2375);
    expect(cecDwelling({ ...none, area: 100, otherLoads: 9500 }, true, false).other).toBe(6875);
  });

  it("adds heating and cooling only when they can run together", () => {
    const l = { ...none, area: 100, heating: 8000, airConditioning: 5000 };
    expect(cecDwelling(l, true, false).hvac).toBe(8000);
    expect(cecDwelling(l, false, false).hvac).toBe(13000);
  });

  it("takes room-by-room heat at 100% to 10 kW, then 75%", () => {
    expect(cecDwelling({ ...none, area: 100, heating: 14000 }, true, true).hvac).toBe(13000);
  });

  it("adds up the IAEI house's listed items", () => {
    const c = cecDwelling({ ...none, area: 269, airConditioning: 6000, range: 11000, hotLoads: 8000, evCharger: 7200, otherLoads: 9500 }, true, false);
    expect(c.watts).toBe(36575);
  });

  it("holds to 100 A from 80 m², and 60 A under that", () => {
    expect(cecDwelling({ ...none, area: 80 }, true, false).rating).toBe(100);
    expect(cecDwelling({ ...none, area: 70 }, true, false).rating).toBe(60);
  });
});
