import { LB_PER_KG } from "../../core/units";
import { money } from "../format";
import { linear, unitConverter } from "../unit-converter";

export const metal = unitConverter({
  id: "metal",
  topic: "Units",
  title: "Metal price",
  blurb: "Copper and aluminum prices per pound ↔ per kilogram, for surcharges.",
  defaultUnit: { eu: "kg" },
  examples: (v) => (v.region === "eu" ? [[9.5, "kg"], [2.4, "kg"], [4.3, "lb"]] : [[4.5, "lb"], [1.1, "lb"], [9.9, "kg"]]),
  units: [linear("lb", "Per pound", "/lb", 1 / LB_PER_KG, 4), linear("kg", "Per kilogram", "/kg", 1, 4)],
  format: (n, u) => `${money(n)}${u.symbol}`,
  formula: ["1 kg = 2.20462 lb, so price per kg = price per lb × 2.20462."],
});
