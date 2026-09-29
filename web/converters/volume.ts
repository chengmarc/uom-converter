import { CM3_PER_IN3 } from "../../src/units";
import { linear, unitConverter } from "../unit-converter";

export const volume = unitConverter({
  id: "volume",
  topic: "Units",
  title: "Box fill volume",
  blurb: "The NEC uses cubic inches, the CEC uses millilitres.",
  defaultUnit: { ca: "ml", eu: "ml" },
  examples: (v) => (v.region === "us" ? [[18, "in3"], [2.25, "in3"], [295, "ml"]] : [[295, "ml"], [18, "in3"], [2.25, "in3"]]),
  units: [linear("in3", "Cubic inches", "in³", 1 / CM3_PER_IN3, 2), linear("ml", "Millilitres (cm³)", "mL", 1, 1)],
  formula: ["1 in³ = 16.387 mL (cm³) exactly: 2.54³."],
});
