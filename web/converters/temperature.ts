import { cToF, fToC } from "../../src/reference";
import { unitConverter } from "../ui";
import { temperatureScale } from "../visuals";

export const temperature = unitConverter({
  id: "temperature",
  group: "Units",
  title: "Temperature",
  blurb: "Conductor insulation and termination ratings are 60, 75 and 90 °C.",
  defaultUnit: { ca: "C", eu: "C" },
  signed: true,
  examples: (v) => (v.region === "us" ? [[167, "F"], [194, "F"], [75, "C"]] : [[75, "C"], [90, "C"], [-40, "C"]]),
  units: [
    { key: "F", name: "Fahrenheit", symbol: "°F", toBase: fToC, fromBase: cToF, digits: 1 },
    { key: "C", name: "Celsius", symbol: "°C", toBase: (n) => n, fromBase: (n) => n, digits: 1 },
  ],
  formula: ["°C = (°F − 32) × 5 ÷ 9.", "°F = °C × 9 ÷ 5 + 32."],
  visual: (n, from) => temperatureScale(from.toBase(n)),
});
