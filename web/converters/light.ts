import { LUX_PER_FC } from "../../src/units";
import { linear, unitConverter } from "../unit-converter";

export const light = unitConverter({
  id: "light",
  topic: "Units",
  title: "Light level",
  blurb: "Foot-candles and lux.",
  defaultUnit: { eu: "lx" },
  examples: (v) => (v.region === "eu" ? [[500, "lx"], [300, "lx"], [50, "fc"]] : [[50, "fc"], [30, "fc"], [500, "lx"]]),
  units: [linear("fc", "Foot-candles", "fc", 1 / LUX_PER_FC, 2), linear("lx", "Lux", "lx", 1, 1)],
  formula: ["1 fc = 1 lumen per ft² = 10.764 lx."],
});
