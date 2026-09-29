import { FT_PER_M, MM_PER_IN } from "../../src/units";
import { linear, unitConverter } from "../unit-converter";

export const length = unitConverter({
  id: "length",
  counterpart: { ft: "m", m: "ft", in: "mm", mm: "in" },
  topic: "Units",
  title: "Length",
  blurb: "Feet, metres, inches and millimetres.",
  defaultUnit: { eu: "m" },
  examples: (v) => (v.region === "eu" ? [[100, "m"], [25, "mm"], [1000, "ft"]] : [[1000, "ft"], [12, "in"], [50, "m"]]),
  units: [
    linear("ft", "Feet", "ft", FT_PER_M),
    linear("m", "Metres", "m", 1),
    linear("in", "Inches", "in", 1000 / MM_PER_IN),
    linear("mm", "Millimetres", "mm", 1000, 2),
  ],
  formula: ["1 ft = 0.3048 m exactly.", "1 in = 25.4 mm exactly."],
});
