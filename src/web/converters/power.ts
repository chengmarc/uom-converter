import { BTUH_PER_W, W_PER_HP } from "../../core/units";
import { linear, unitConverter } from "../unit-converter";

export const power = unitConverter({
  id: "power",
  counterpart: { hp: "kW", kW: "hp", W: "btu", btu: "W" },
  topic: "Units",
  title: "Power",
  blurb: "Horsepower, kilowatts and BTU per hour (electric heat).",
  note: "Horsepower here is output power. It is not motor current; use the code tables for full-load amps.",
  defaultUnit: { eu: "kW" },
  examples: (v) => (v.region === "eu" ? [[7.5, "kW"], [10, "hp"], [2000, "W"]] : [[10, "hp"], [5000, "btu"], [7.5, "kW"]]),
  units: [
    linear("hp", "Horsepower", "hp", 1 / W_PER_HP, 3),
    linear("kW", "Kilowatts", "kW", 0.001, 3),
    linear("W", "Watts", "W", 1, 1),
    linear("btu", "BTU per hour", "BTU/h", BTUH_PER_W, 0),
  ],
  formula: ["1 hp = 745.7 W (mechanical horsepower).", "1 W = 3.412 BTU/h (International Table BTU)."],
});
