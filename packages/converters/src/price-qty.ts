import { unitPrice } from "@uom/core/pricing";
import { fmt, money, moneyAmount } from "./format";
import type { Converter, Example, Row } from "./model";
import { isNum, invalid } from "./checks";
import { t } from "@uom/i18n";

export const priceQty: Converter = {
  id: "price-qty",
  topic: "Product data",
  title: "Price quantity → unit price",
  blurb: "Price files give a price for a price quantity of order units, and an order unit can hold several content units (a box of 100 connectors).",
  empty: "Enter a price and its price quantity.",
  examples: (): Example[] => [
    { label: t("{price} per 100", { price: money(45) }), set: { price: "45", qty: "100", content: "1" } },
    { label: t("{price} for 10 boxes of 25", { price: money(250) }), set: { price: "250", qty: "10", content: "25" } },
    { label: t("{price} per box of {size}", { price: money(125), size: 100 }), set: { price: "125", qty: "1", content: "100" } },
  ],
  fields: [
    { kind: "number", id: "price", label: "Price", currency: true, placeholder: "45.00" },
    { kind: "number", id: "qty", label: "Price quantity", suffix: "order units", value: "1" },
    { kind: "number", id: "content", label: "Content units per order unit", suffix: "per order unit", value: "1" },
  ],
  compute(v) {
    const p = v.num("price");
    const qty = v.num("qty");
    const content = v.num("content");
    const bad = invalid([
      ["price", Number.isNaN(p)],
      ["qty", !isNum(qty) || qty === 0],
      ["content", !isNum(content) || content === 0],
    ]);
    if (bad.length) return { error: "Enter numbers; quantities must be more than 0.", fields: bad };
    if (p === undefined) return undefined;
    const u = unitPrice(p, qty!, content!);
    const h = { price: money(p), qty: fmt(qty!, 3), content: fmt(content!, 3) };
    const rows: Row[] = [];
    if (content !== 1) rows.push({ label: "Per content unit (each)", ...moneyAmount(u.perContentUnit, 6) });
    rows.push(
      { label: "Per order unit", ...moneyAmount(u.perOrderUnit, 6) },
      { group: "Per content unit, as C / M", label: "Per 100 (C)", ...moneyAmount(u.perContentUnit * 100) },
      { group: "Per content unit, as C / M", label: "Per 1,000 (M)", ...moneyAmount(u.perContentUnit * 1000) },
    );
    return {
      heading:
        content === 1
          ? qty === 1 ? t("{price} for {qty} order unit", h) : t("{price} for {qty} order units", h)
          : qty === 1 ? t("{price} for {qty} order unit of {content}", h) : t("{price} for {qty} order units of {content}", h),
      rows,
      formula: ["Per order unit = price ÷ price quantity.", "Per content unit = per order unit ÷ content units per order unit."],
    };
  },
};
