// Motor branch circuits: code-table full-load current, and the sizing built on it.

import { smallestSizeForAmps, type WiringCode } from "./ampacity";
import type { Phase } from "./electrical";
import { ratingAtLeast, ratingAtMost } from "./ratings";

/** Three-phase induction motors, NEC Table 430.250, amps at 208, 230, 460 and 575 V. */
const THREE_PHASE: Record<string, [number, number, number, number]> = {
  "1/2": [2.4, 2.2, 1.1, 0.9],
  "3/4": [3.5, 3.2, 1.6, 1.3],
  "1": [4.6, 4.2, 2.1, 1.7],
  "1-1/2": [6.6, 6, 3, 2.4],
  "2": [7.5, 6.8, 3.4, 2.7],
  "3": [10.6, 9.6, 4.8, 3.9],
  "5": [16.7, 15.2, 7.6, 6.1],
  "7-1/2": [24.2, 22, 11, 9],
  "10": [30.8, 28, 14, 11],
  "15": [46.2, 42, 21, 17],
  "20": [59.4, 54, 27, 22],
  "25": [74.8, 68, 34, 27],
  "30": [88, 80, 40, 32],
  "40": [114, 104, 52, 41],
  "50": [143, 130, 65, 52],
};
const THREE_PHASE_VOLTS = [208, 230, 460, 575];

/** Single-phase motors, NEC Table 430.248, amps at 115, 200, 208 and 230 V. */
const SINGLE_PHASE: Record<string, [number, number, number, number]> = {
  "1/6": [4.4, 2.5, 2.4, 2.2],
  "1/4": [5.8, 3.3, 3.2, 2.9],
  "1/3": [7.2, 4.1, 4, 3.6],
  "1/2": [9.8, 5.6, 5.4, 4.9],
  "3/4": [13.8, 7.9, 7.6, 6.9],
  "1": [16, 9.2, 8.8, 8],
  "1-1/2": [20, 11.5, 11, 10],
  "2": [24, 13.8, 13.2, 12],
  "3": [34, 19.6, 18.7, 17],
  "5": [56, 32.2, 30.8, 28],
  "7-1/2": [80, 46, 44, 40],
  "10": [100, 57.5, 55, 50],
};
const SINGLE_PHASE_VOLTS = [115, 200, 208, 230];

/** Every horsepower in either table, smallest first. */
export const MOTOR_HP = ["1/6", "1/4", "1/3", "1/2", "3/4", "1", "1-1/2", "2", "3", "5", "7-1/2", "10", "15", "20", "25", "30", "40", "50"];

/** The tables are by motor rating: a motor on a 120, 240, 480 or 600 V system is its 115, 230, 460 or 575 V column. */
const MOTOR_RATING: Record<number, number> = { 110: 115, 115: 115, 120: 115, 220: 230, 230: 230, 240: 230, 440: 460, 460: 460, 480: 460, 550: 575, 575: 575, 600: 575 };

/** Table full-load current. Undefined for a size or voltage the tables don't have. */
export function motorFullLoadAmps(hp: string, volts: number, phase: Phase): number | undefined {
  const rating = MOTOR_RATING[volts] ?? volts;
  const [table, columns] = phase === 3 ? [THREE_PHASE, THREE_PHASE_VOLTS] : [SINGLE_PHASE, SINGLE_PHASE_VOLTS];
  const column = columns.indexOf(rating);
  return column === -1 ? undefined : table[hp]?.[column];
}

/**
 * The largest standard device a percentage of full-load current allows. Where it falls between
 * sizes the NEC lets you go up to the next one, and the CEC holds you to the one below.
 */
function maximumDevice(fla: number, percent: number, code: WiringCode) {
  const exact = (fla * percent) / 100;
  return code === "nec" ? ratingAtLeast(exact) : (ratingAtMost(exact) ?? ratingAtLeast(0));
}

/** A single motor's circuit: conductors at 125% of table current, on 75 °C terminals, and the most protection allowed. */
export function motorCircuit(fla: number, code: WiringCode) {
  const conductorAmps = fla * 1.25;
  const size = smallestSizeForAmps(conductorAmps, { metal: "Cu", insulation: 75, ambientC: 30, conductors: 3, code, terminal: 75, ignoreSmallLimit: true });
  return {
    conductorAmps,
    size,
    breaker: maximumDevice(fla, 250, code),
    timeDelayFuse: maximumDevice(fla, 175, code),
    fastFuse: maximumDevice(fla, 300, code),
  };
}

/** Overload setting from the nameplate: 125% at a service factor of 1.15 or more, otherwise 115%. */
export const motorOverloadAmps = (nameplateAmps: number, serviceFactorHigh: boolean) => nameplateAmps * (serviceFactorHigh ? 1.25 : 1.15);
