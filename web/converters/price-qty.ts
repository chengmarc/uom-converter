import { unitPrice } from "../../src/uom";
import { fmt, money, plain, type Converter, type Example, type Row } from "../ui";
import { isNum, invalid } from "./shared";

export const priceQty: Converter = {
  id: "price-qty",
  group: "Product data",
  title: "Price quantity → unit price",
  blurb: "Price files give a price for a price quantity of order units, and an order unit can hold several content units (a box of 100 connectors).",
  empty: "Enter a price and its price quantity.",
  examples: (): Example[] => [
    { label: `${money(45)} per 100`, set: { price: "45", qty: "100", content: "1" } },
    { label: `${money(250)} for 10 boxes of 25`, set: { price: "250", qty: "10", content: "25" } },
    { label: `${money(125)} per box of 100`, set: { price: "125", qty: "1", content: "100" } },
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
    const rows: Row[] = [];
    if (content !== 1) rows.push({ label: "Per content unit (each)", value: money(u.perContentUnit), copy: plain(u.perContentUnit, 6) });
    rows.push(
      { label: "Per order unit", value: money(u.perOrderUnit), copy: plain(u.perOrderUnit, 6) },
      { group: "Per content unit, as C / M", label: "Per 100 (C)", value: money(u.perContentUnit * 100), copy: plain(u.perContentUnit * 100, 5) },
      { group: "Per content unit, as C / M", label: "Per 1,000 (M)", value: money(u.perContentUnit * 1000), copy: plain(u.perContentUnit * 1000, 5) },
    );
    return {
      heading: `${money(p)} for ${fmt(qty!, 3)} order unit${qty === 1 ? "" : "s"}${content === 1 ? "" : ` of ${fmt(content!, 3)}`}`,
      rows,
      formula: ["Per order unit = price ÷ price quantity.", "Per content unit = per order unit ÷ content units per order unit."],
    };
  },
};
