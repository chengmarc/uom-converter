import { NM_PER_LBF_IN } from "../../core/units";
import { linear, unitConverter } from "../unit-converter";

export const torque = unitConverter({
  id: "torque",
  counterpart: { lbin: "nm", lbft: "nm", nm: "lbin" },
  topic: "Units",
  title: "Torque",
  blurb: "Lug and breaker termination torque.",
  defaultUnit: { eu: "nm" },
  examples: (v) => (v.region === "eu" ? [[2.5, "nm"], [35, "lbin"], [50, "lbft"]] : [[35, "lbin"], [50, "lbft"], [5, "nm"]]),
  units: [
    linear("lbin", "Pound-inches", "lbf·in", 1 / NM_PER_LBF_IN, 1),
    linear("lbft", "Pound-feet", "lbf·ft", 1 / (NM_PER_LBF_IN * 12), 2),
    linear("nm", "Newton-metres", "N·m", 1, 2),
  ],
  formula: ["1 lbf·in = 0.113 N·m. 1 lbf·ft = 12 lbf·in = 1.356 N·m."],
});
