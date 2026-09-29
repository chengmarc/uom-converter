import { LB_PER_KG } from "../../src/reference";
import { linear, unitConverter } from "../ui";

export const weight = unitConverter({
  id: "weight",
  group: "Units",
  title: "Weight",
  blurb: "Pounds and kilograms.",
  defaultUnit: { eu: "kg" },
  examples: (v) => (v.region === "eu" ? [[25, "kg"], [953, "kg"], [50, "lb"]] : [[50, "lb"], [640, "lb"], [25, "kg"]]),
  units: [linear("lb", "Pounds", "lb", LB_PER_KG, 3), linear("kg", "Kilograms", "kg", 1, 3)],
  formula: ["1 lb = 0.45359237 kg exactly."],
});
