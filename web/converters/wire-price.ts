import { METRES_PER_PRICE_UNIT } from "../../src/pricing";
import { money } from "../format";
import { linear, unitConverter } from "../unit-converter";

export const wirePrice = unitConverter({
  id: "wire-price",
  counterpart: { ft: "m", Cft: "m", Mft: "m", m: "Mft", km: "Mft" },
  topic: "Pricing",
  title: "Wire price per ft ↔ m",
  blurb: "Wire price per ft, per 100 ft (C), per 1,000 ft (M), per metre and per km.",
  defaultUnit: { us: "Mft", ca: "Mft", eu: "m" },
  examples: (v) => (v.region === "eu" ? [[1.25, "m"], [450, "Mft"], [1250, "km"]] : [[450, "Mft"], [0.45, "ft"], [1.25, "m"]]),
  units: [
    linear("ft", "Per foot", "ft", METRES_PER_PRICE_UNIT.ft, 5),
    linear("Cft", "Per 100 ft (C ft)", "C ft", METRES_PER_PRICE_UNIT.Cft, 4),
    linear("Mft", "Per 1,000 ft (M ft)", "M ft", METRES_PER_PRICE_UNIT.Mft, 2),
    linear("m", "Per metre", "m", METRES_PER_PRICE_UNIT.m, 5),
    linear("km", "Per km", "km", METRES_PER_PRICE_UNIT.km, 2),
  ],
  format: (n, u) => `${money(n)} / ${u.symbol}`,
  formula: ["1 ft = 0.3048 m exactly, so price per metre = price per foot ÷ 0.3048.", "C ft = 100 ft, M ft = 1,000 ft."],
});
