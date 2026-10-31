import { describe, expect, it } from "vitest";
import { motorCircuit, motorFullLoadAmps, motorOverloadAmps } from "./motors";

describe("motor full-load current", () => {
  it("reads the NEC tables", () => {
    expect(motorFullLoadAmps("10", 460, 3)).toBe(14);
    expect(motorFullLoadAmps("5", 208, 3)).toBe(16.7);
    expect(motorFullLoadAmps("50", 575, 3)).toBe(52);
    expect(motorFullLoadAmps("1", 115, 1)).toBe(16);
    expect(motorFullLoadAmps("10", 230, 1)).toBe(50);
  });

  it("reads a system voltage as the motor rating on it", () => {
    expect(motorFullLoadAmps("10", 480, 3)).toBe(14);
    expect(motorFullLoadAmps("10", 600, 3)).toBe(11);
    expect(motorFullLoadAmps("1", 120, 1)).toBe(16);
    expect(motorFullLoadAmps("1", 240, 1)).toBe(8);
  });

  it("has no answer for what the tables don't list", () => {
    expect(motorFullLoadAmps("1/6", 460, 3)).toBeUndefined();
    expect(motorFullLoadAmps("15", 230, 1)).toBeUndefined();
    expect(motorFullLoadAmps("5", 347, 3)).toBeUndefined();
  });
});

// Mike Holt's published single- and three-phase motor charts: whole designs, not single values.
describe("a motor circuit", () => {
  it.each([
    [1.1, "14 AWG", 15],
    [15.2, "14 AWG", 40],
    [16.7, "12 AWG", 45],
    [14, "14 AWG", 35],
    [30.8, "8 AWG", 80],
    [46.2, "6 AWG", 125],
    [74.8, "3 AWG", 200],
    [68, "4 AWG", 175],
    [55, "4 AWG", 150],
  ])("sizes %s A", (fla, size, breaker) => {
    const c = motorCircuit(fla, "nec");
    expect(c.size?.label).toBe(size);
    expect(c.breaker).toBe(breaker);
  });

  it("sizes time-delay fuses at 175%", () => {
    expect(motorCircuit(16.7, "nec").timeDelayFuse).toBe(30);
    expect(motorCircuit(30.8, "nec").timeDelayFuse).toBe(60);
  });

  it("holds the CEC to the next size down", () => {
    expect(motorCircuit(16.7, "cec").breaker).toBe(40);
    expect(motorCircuit(1.1, "cec").breaker).toBe(15);
  });
});

describe("motor overloads", () => {
  it("go by service factor", () => {
    expect(motorOverloadAmps(10, true)).toBe(12.5);
    expect(motorOverloadAmps(10, false)).toBeCloseTo(11.5);
  });
});
