import { discountToMultiplier, multiplierToDiscount } from "../../src/pricing";
import { fmt, money, parseNumber, plain, typed } from "../format";
import type { Converter, Example, Row } from "../ui";
import { isNum } from "./checks";

export const multiplier: Converter = {
  id: "multiplier",
  topic: "Pricing",
  title: "List × multiplier",
  blurb: 'Net price from list price. Discounts can be chained: "50/10" is 50% off, then 10% off that.',
  empty: "Enter a multiplier or a discount.",
  examples: (): Example[] => [
    { label: `50/10 off ${money(100)} list`, set: { kind: "disc", value: "50/10", list: "100" } },
    { label: `Multiplier × ${fmt(0.42, 2)}`, set: { kind: "mult", value: typed(0.42) } },
    { label: "35% off", set: { kind: "disc", value: "35" } },
  ],
  fields: [
    {
      kind: "choice",
      id: "kind",
      label: "You have a",
      options: [
        { value: "mult", label: "Multiplier" },
        { value: "disc", label: "Discount" },
      ],
    },
    {
      kind: "text",
      id: "value",
      label: (v) => (v.str("kind") === "mult" ? "Multiplier" : "Discount (%)"),
      suffix: (v) => (v.str("kind") === "mult" ? "× list" : "% off"),
      placeholder: (v) => (v.str("kind") === "mult" ? typed(0.42) : "50/10"),
    },
    { kind: "number", id: "list", label: "List price", currency: true, placeholder: "0.00", optional: true },
  ],
  compute(v) {
    const raw = v.str("value");
    const list = v.num("list");
    if (Number.isNaN(list)) return { error: "Enter the list price as a number.", fields: ["list"] };
    if (raw === "") return undefined;
    const isMult = v.str("kind") === "mult";
    let m: number;
    if (isMult) {
      const n = parseNumber(raw);
      if (!isNum(n) || n === 0) return { error: "Enter a multiplier like 0.42.", fields: ["value"] };
      m = n;
    } else {
      const r = discountToMultiplier(raw);
      if (typeof r !== "number") return { error: r.error + ".", fields: ["value"] };
      m = r;
    }
    const discount = multiplierToDiscount(m);
    const rows: Row[] = [];
    if (list !== undefined) rows.push({ label: "Net price", value: money(list * m), copy: plain(list * m, 5) });
    rows.push(
      isMult
        ? { label: "Equivalent discount", value: `${fmt(discount, 2)}% off`, copy: plain(discount, 2) }
        : { label: "Multiplier", value: `× ${fmt(m, 4)}`, copy: plain(m, 4) },
    );
    if (!isMult && raw.includes("/")) rows.push({ label: "Same as a single discount of", value: `${fmt(discount, 2)}%`, copy: plain(discount, 2) });
    if (list !== undefined) rows.push({ label: "Off list", value: money(list - list * m), copy: plain(list - list * m, 5) });

    const parts = isMult ? [] : raw.split("/").map((p) => 1 - Number(p.replace("%", "")) / 100);
    return {
      heading: isMult ? `Multiplier ${fmt(m, 4)}${list !== undefined ? ` on ${money(list)} list` : ""}` : `${raw.replace(/%/g, "")}% off${list !== undefined ? ` ${money(list)} list` : ""}`,
      rows,
      formula: [
        "Net price = list × multiplier. Multiplier = 1 − discount.",
        ...(parts.length > 1 ? [`Chained discounts multiply: ${parts.map((p) => `× ${fmt(p, 4)}`).join(" ")} = × ${fmt(m, 4)}.`] : []),
      ],
    };
  },
};
