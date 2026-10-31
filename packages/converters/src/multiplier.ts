import { discountToMultiplier, multiplierToDiscount } from "@uom/core/pricing";
import { amount, dotDecimal, fmt, money, moneyAmount, parseNumber, plain, typed } from "./format";
import type { Converter, Example, Row } from "./model";
import { isNum } from "./checks";
import { t } from "@uom/i18n";

export const multiplier: Converter = {
  id: "multiplier",
  topic: "Pricing",
  title: "List × multiplier",
  blurb: 'Net price from list price. Discounts can be chained: "50/10" is 50% off, then 10% off that.',
  empty: "Enter a multiplier or a discount.",
  examples: (): Example[] => [
    { label: t("{chain} off {price} list", { chain: "50/10", price: money(100) }), set: { kind: "disc", value: "50/10", list: "100" } },
    { label: t("Multiplier × {value}", { value: fmt(0.42, 2) }), set: { kind: "mult", value: typed(0.42) } },
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
      const r = discountToMultiplier(dotDecimal(raw));
      if (typeof r !== "number") return { error: t("{error}.", { error: r.error }), fields: ["value"] };
      m = r;
    }
    const discount = multiplierToDiscount(m);
    const rows: Row[] = [];
    if (list !== undefined) rows.push({ label: "Net price", ...moneyAmount(list * m) });
    rows.push(
      isMult
        ? { label: "Equivalent discount", ...amount(discount, 2, t("% off")) }
        : { label: "Multiplier", value: `× ${fmt(m, 4)}`, copy: plain(m, 4) },
    );
    if (!isMult && raw.includes("/")) rows.push({ label: "Same as a single discount of", ...amount(discount, 2, "%") });
    if (list !== undefined) rows.push({ label: "Off list", ...moneyAmount(list - list * m) });

    const parts = isMult ? [] : dotDecimal(raw).split("/").map((p) => 1 - Number(p.replace("%", "")) / 100);
    return {
      heading: isMult
        ? list !== undefined ? t("Multiplier {value} on {price} list", { value: fmt(m, 4), price: money(list) }) : t("Multiplier {value}", { value: fmt(m, 4) })
        : list !== undefined ? t("{discount}% off {price} list", { discount: raw.replace(/%/g, ""), price: money(list) }) : t("{discount}% off", { discount: raw.replace(/%/g, "") }),
      rows,
      formula: [
        "Net price = list × multiplier. Multiplier = 1 − discount.",
        ...(parts.length > 1 ? [t("Chained discounts multiply: {steps} = × {result}.", { steps: parts.map((p) => `× ${fmt(p, 4)}`).join(" "), result: fmt(m, 4) })] : []),
      ],
    };
  },
};
