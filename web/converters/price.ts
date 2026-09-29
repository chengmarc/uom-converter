import { convertPrice, type PriceUom } from "../../src/pricing";
import { money, plain, typed } from "../format";
import type { Converter, Example } from "../ui";

const PRICE_UNITS: { uom: PriceUom; name: string; short: string }[] = [
  { uom: "E", name: "Per each (E)", short: "each" },
  { uom: "C", name: "Per 100 (C)", short: "per C" },
  { uom: "M", name: "Per 1,000 (M)", short: "per M" },
];

export const price: Converter = {
  id: "price",
  topic: "Pricing",
  title: "Price per E / C / M",
  blurb: "Distributor price units: E is per each, C is per 100, M is per 1,000. Wire is usually priced per M feet.",
  empty: "Enter a price to see it per each, per 100 and per 1,000.",
  examples: (): Example[] => [
    { label: `${money(450)} per M (wire)`, set: { price: "450", uom: "M" } },
    { label: `${money(125)} per C`, set: { price: "125", uom: "C" } },
    { label: `${money(0.45)} each`, set: { price: typed(0.45), uom: "E" } },
  ],
  fields: [
    { kind: "number", id: "price", label: "Price", currency: true, placeholder: "0.00" },
    {
      kind: "choice",
      id: "uom",
      label: "Priced per",
      options: [
        { value: "E", label: "Each (E)" },
        { value: "C", label: "100 (C)" },
        { value: "M", label: "1,000 (M)" },
      ],
    },
  ],
  compute(v) {
    const p = v.num("price");
    if (p === undefined) return undefined;
    if (Number.isNaN(p)) return { error: "Enter a number, like 125 or 0.45.", fields: ["price"] };
    const from = v.str("uom") as PriceUom;
    const fromName = PRICE_UNITS.find((u) => u.uom === from)!.name.toLowerCase();
    return {
      heading: `${money(p)} ${fromName} equals`,
      rows: PRICE_UNITS.filter((u) => u.uom !== from).map((u) => {
        const out = convertPrice(p, from, u.uom);
        return { label: u.name, value: money(out), copy: plain(out, 5) };
      }),
      formula: ["1 C = 100 each, 1 M = 1,000 each.", "Per each = per C ÷ 100 = per M ÷ 1,000."],
    };
  },
};
