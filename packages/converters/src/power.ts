import { BTUH_PER_TON, BTUH_PER_W, W_PER_HP, W_PER_METRIC_HP } from "@uom/core/units";
import { linear, unitConverter } from "./unit-converter";

export const power = unitConverter({
  id: "power",
  counterpart: { hp: "kW", ps: "kW", kW: "hp", W: "btu", btu: "W", ton: "btu" },
  topic: "Units",
  title: "Power",
  blurb: "Horsepower, kilowatts, BTU per hour (electric heat) and tons of cooling.",
  note: "Horsepower here is output power. It is not motor current; use the code tables for full-load amps. A ton of cooling is the heat moved, not the electrical load.",
  defaultUnit: { eu: "kW" },
  examples: (v) => (v.region === "eu" ? [[7.5, "kW"], [10, "hp"], [2000, "W"]] : [[10, "hp"], [5000, "btu"], [7.5, "kW"]]),
  units: [
    linear("hp", "Horsepower", "hp", 1 / W_PER_HP, 3),
    linear("ps", "Metric horsepower", "PS", 1 / W_PER_METRIC_HP, 3),
    linear("kW", "Kilowatts", "kW", 0.001, 3),
    linear("W", "Watts", "W", 1, 1),
    linear("btu", "BTU per hour", "BTU/h", BTUH_PER_W, 0),
    linear("ton", "Tons of cooling", "ton", BTUH_PER_W / BTUH_PER_TON, 3),
  ],
  formula: ["1 hp = 745.7 W (mechanical horsepower).", "1 PS = 735.5 W (metric horsepower, also CV).", "1 W = 3.412 BTU/h (International Table BTU).", "1 ton of cooling = 12,000 BTU/h."],
  common: { hp: [0.5, 1, 2, 5, 10, 25, 50, 100], kW: [0.75, 1.5, 2.2, 5.5, 7.5, 11, 15, 37, 75], W: [500, 1000, 1500, 5000], btu: [5000, 10000, 20000, 50000], ton: [1, 1.5, 2, 3, 5, 10] },
});
