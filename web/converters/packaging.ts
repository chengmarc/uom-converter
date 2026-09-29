import { makePackGtin14, parseGtin } from "../../src/gtin";
import { fmt } from "../format";
import type { Converter, Example, Row } from "../ui";
import { isNum, invalid } from "./checks";

export const packaging: Converter = {
  id: "packaging",
  topic: "Product data",
  title: "Packaging levels",
  blurb: "Each → inner pack → case → pallet quantities, with GTIN-14s for the pack levels built from the item GTIN.",
  empty: "Enter at least the each-per-case quantity.",
  note: "Indicator digits 1–8 are yours to assign: 1 inner, 2 case, 3 pallet is a common convention, not a rule. Pallets are often identified by SSCC instead.",
  examples: (): Example[] => [
    { label: "10 / 100 / 40 cases, with a UPC", set: { inner: "10", case: "100", pallet: "40", gtin: "036000291452" } },
    { label: "25 per case, 60 cases per pallet", set: { case: "25", pallet: "60" } },
  ],
  fields: [
    { kind: "number", id: "case", label: "Each per case", placeholder: "100" },
    { kind: "number", id: "inner", label: "Each per inner pack", placeholder: "10", optional: true },
    { kind: "number", id: "pallet", label: "Cases per pallet", placeholder: "40", optional: true },
    { kind: "text", id: "gtin", label: "Item GTIN (each)", placeholder: "UPC-A, EAN-13 or GTIN-14", optional: true },
  ],
  compute(v) {
    const inner = v.num("inner");
    const kase = v.num("case");
    const pallet = v.num("pallet");
    const gtin = v.str("gtin");
    const whole = (n: number | undefined) => n === undefined || (isNum(n) && n > 0 && Number.isInteger(n));
    const bad = invalid([
      ["inner", !whole(inner)],
      ["case", !whole(kase)],
      ["pallet", !whole(pallet)],
    ]);
    if (bad.length) return { error: "Quantities must be whole numbers above 0.", fields: bad };
    if (kase === undefined) return undefined;
    if (inner !== undefined && kase % inner !== 0) return { error: `${fmt(kase, 0)} each per case doesn't divide into inner packs of ${fmt(inner, 0)}.`, fields: ["inner", "case"] };

    const q = "Quantities";
    const rows: Row[] = [];
    if (pallet !== undefined) rows.push({ group: q, label: "Each per pallet", value: fmt(kase * pallet, 0) });
    if (inner !== undefined) rows.push({ group: q, label: "Inner packs per case", value: fmt(kase / inner, 0) });
    if (pallet !== undefined && inner !== undefined) rows.push({ group: q, label: "Inner packs per pallet", value: fmt((kase / inner) * pallet, 0) });
    if (gtin !== "") {
      const parsed = parseGtin(gtin);
      if (!parsed.valid) return { error: `Item GTIN: ${parsed.errors[0] ?? "not valid"}`, fields: ["gtin"] };
      const g = "GTIN-14 (indicator digit)";
      if (inner !== undefined) rows.push({ group: g, label: "Inner pack (1)", value: makePackGtin14(gtin, 1) });
      rows.push({ group: g, label: "Case (2)", value: makePackGtin14(gtin, 2) });
      if (pallet !== undefined) rows.push({ group: g, label: "Pallet (3)", value: makePackGtin14(gtin, 3) });
    }
    if (!rows.length) rows.push({ group: q, label: "Each per case", value: fmt(kase, 0) });
    return {
      heading: `${inner !== undefined ? `${fmt(inner, 0)} per inner, ` : ""}${fmt(kase, 0)} per case${pallet !== undefined ? `, ${fmt(pallet, 0)} cases per pallet` : ""}`,
      rows,
      formula: ["GTIN-14 = indicator digit + first 12 digits of the item's GTIN-13 form + a new check digit (GS1 mod-10)."],
    };
  },
};
