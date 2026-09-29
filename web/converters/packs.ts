import { unitsToOrder } from "../../src/pricing";
import { fmt, money, plain, typed } from "../format";
import type { Converter, Example, Row } from "../ui";
import { packs as packsVisual } from "../visuals";
import { invalid } from "./checks";

export const packs: Converter = {
  id: "packs",
  topic: "Pricing",
  title: "Boxes & packs",
  blurb: "How many packs to order for a quantity, and price per each ↔ per pack.",
  empty: "Enter a quantity and pack size, or a price and pack size.",
  examples: (): Example[] => [
    { label: "250 each, packs of 100", set: { need: "250", size: "100" } },
    { label: `${money(12.5)} per box of 100`, set: { size: "100", price: typed(12.5), per: "pack" } },
    { label: `${fmt(1000, 0)} each at ${money(0.18)}, packs of 50`, set: { need: "1000", size: "50", price: typed(0.18), per: "each" } },
  ],
  fields: [
    { kind: "number", id: "need", label: "Quantity needed", suffix: "each", placeholder: "250", optional: true },
    { kind: "number", id: "size", label: "Pack size", suffix: "each per pack", placeholder: "100" },
    { kind: "number", id: "price", label: "Price", currency: true, placeholder: "0.00", optional: true },
    {
      kind: "choice",
      id: "per",
      label: "Price is",
      options: [
        { value: "each", label: "Per each" },
        { value: "pack", label: "Per pack" },
      ],
    },
  ],
  compute(v) {
    const need = v.num("need");
    const size = v.num("size");
    const p = v.num("price");
    const bad = invalid([
      ["need", Number.isNaN(need)],
      ["size", Number.isNaN(size) || size === 0],
      ["price", Number.isNaN(p)],
    ]);
    if (bad.length) return { error: "Enter numbers; pack size must be more than 0.", fields: bad };
    if (size === undefined || (need === undefined && p === undefined)) return undefined;

    const rows: Row[] = [];
    let heading = `Packs of ${fmt(size, 3)}`;
    let visual: Element | undefined;
    const perPack = v.str("per") === "pack";
    const packPrice = p === undefined ? undefined : perPack ? p : p * size;
    if (need !== undefined) {
      const o = unitsToOrder(need, size);
      heading = `${fmt(need, 3)} each, in packs of ${fmt(size, 3)}`;
      rows.push(
        { label: "Packs to order", value: fmt(o.units, 0) },
        {
          label: "You receive",
          detail: o.over > 0 ? `${fmt(o.over, 3)} more than you need` : "exactly what you need",
          value: `${fmt(o.total, 3)} each`,
          copy: plain(o.total, 3),
          status: o.over > 0 ? "warn" : "good",
        },
      );
      if (packPrice !== undefined) rows.push({ label: "Order total", value: money(o.units * packPrice), copy: plain(o.units * packPrice, 5) });
      if (o.units > 0) {
        visual = packsVisual({
          count: o.units,
          lastUsed: 1 - o.over / size,
          shape: "box",
          label: o.over > 0 ? `${fmt(o.units, 0)} packs · last one has ${fmt(o.over, 3)} extra` : `${fmt(o.units, 0)} full packs`,
        });
      }
    }
    if (p !== undefined && packPrice !== undefined) {
      rows.push(
        perPack
          ? { label: "Price per each", value: money(packPrice / size), copy: plain(packPrice / size, 5) }
          : { label: "Price per pack", value: money(packPrice), copy: plain(packPrice, 5) },
      );
    }
    return {
      heading,
      rows,
      visual,
      formula: ["Packs = quantity ÷ pack size, rounded up.", "Price per pack = price per each × pack size.", "Order total = packs × price per pack."],
    };
  },
};
