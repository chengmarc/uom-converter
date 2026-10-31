import { marginToMarkup, markupToMargin, sellFromCostAtMargin } from "@uom/core/pricing";
import { amount, fmt, money, moneyAmount, plain } from "./format";
import type { Converter, Example, Row } from "./model";
import { isNum, invalid } from "./checks";
import { t } from "@uom/i18n";

export const margin: Converter = {
  id: "margin",
  topic: "Pricing & ordering",
  title: "Margin ↔ markup",
  blurb: "Margin is profit as a % of the sell price; markup is profit as a % of cost. 25% margin = 33.3% markup.",
  empty: "Enter a margin or markup percentage.",
  examples: (): Example[] => [
    { label: t("{pct}% margin on {price} cost", { pct: 25, price: money(75) }), set: { kind: "margin", pct: "25", cost: "75" } },
    { label: t("{pct}% markup", { pct: 50 }), set: { kind: "markup", pct: "50" } },
    { label: t("{pct}% margin", { pct: 30 }), set: { kind: "margin", pct: "30" } },
  ],
  fields: [
    {
      kind: "choice",
      id: "kind",
      label: "You have a",
      options: [
        { value: "margin", label: "Margin" },
        { value: "markup", label: "Markup" },
      ],
    },
    { kind: "number", id: "pct", label: (v) => (v.str("kind") === "margin" ? "Margin" : "Markup"), suffix: "%", placeholder: "25" },
    { kind: "number", id: "cost", label: "Cost", currency: true, placeholder: "0.00", optional: true },
  ],
  compute(v) {
    const pct = v.num("pct");
    const cost = v.num("cost");
    const isMargin = v.str("kind") === "margin";
    const bad = invalid([
      ["pct", Number.isNaN(pct) || (isMargin && isNum(pct) && pct >= 100)],
      ["cost", Number.isNaN(cost)],
    ]);
    if (bad.length) return { error: "Enter numbers; margin must be under 100%.", fields: bad };
    if (pct === undefined) return undefined;
    const marginF = isMargin ? pct / 100 : markupToMargin(pct / 100);
    const markupF = isMargin ? marginToMarkup(pct / 100) : pct / 100;
    const rows: Row[] = [];
    if (cost !== undefined) {
      const sell = sellFromCostAtMargin(cost, marginF);
      rows.push({ label: "Sell price", ...moneyAmount(sell) });
    }
    rows.push(
      isMargin
        ? { label: "Markup", ...amount(markupF * 100, 2, "%") }
        : { label: "Margin", ...amount(marginF * 100, 2, "%") },
      { label: "Cost multiplier", detail: "sell price = cost × this", value: `× ${fmt(1 + markupF, 4)}`, copy: plain(1 + markupF, 4) },
    );
    if (cost !== undefined) {
      const profit = sellFromCostAtMargin(cost, marginF) - cost;
      rows.push({ label: "Profit", ...moneyAmount(profit) });
    }
    const h = { pct: fmt(pct, 2), price: money(cost ?? 0) };
    return {
      heading: cost !== undefined
        ? isMargin ? t("{pct}% margin on {price} cost", h) : t("{pct}% markup on {price} cost", h)
        : isMargin ? t("{pct}% margin", h) : t("{pct}% markup", h),
      rows,
      formula: [
        "Margin = profit ÷ sell price. Markup = profit ÷ cost.",
        "Markup = margin ÷ (1 − margin). Margin = markup ÷ (1 + markup).",
        "Sell price = cost ÷ (1 − margin).",
      ],
    };
  },
};
