import { lookupUom, UOM_CODES } from "@uom/core/uom";
import type { Converter } from "./model";
import { t } from "@uom/i18n";

export const uomCodes: Converter = {
  id: "uom-codes",
  topic: "Product data",
  title: "UOM codes",
  blurb: "Unit as it appears in a supplier file or ERP (EA, ft, box, lbs…) to its UN/ECE Recommendation 20 code, as used in BMEcat, ETIM and e-invoicing.",
  empty: "Enter a unit or code, like EA, pcs, ft, box or in-lb.",
  examples: () => ["EA", "pcs", "ft", "RL", "box", "in-lb"].map((u) => ({ label: u, set: { unit: u } })),
  fields: [{ kind: "text", id: "unit", label: "Unit or code as written", placeholder: "EA, pcs, ft, box, lbs" }],
  compute(v) {
    const raw = v.str("unit");
    if (raw === "") return undefined;
    const u = lookupUom(raw);
    if (!u) return { error: "Not in this list. It covers units common in electrical product data; see “All codes” below.", fields: ["unit"] };
    return {
      heading: t("“{raw}” is", { raw }),
      rows: [
        { label: "UN/ECE code", detail: u.note, value: u.code },
        { label: "Name", value: t(u.name) },
        ...(u.symbol ? [{ label: "Symbol", value: u.symbol }] : []),
        { label: "Category", value: t(u.category) },
      ],
      formula: ["UN/ECE Recommendation 20 unit codes; package types from Recommendation 21, written with an X prefix (XBX = box) as in the Peppol code list."],
    };
  },
  table: () => ({
    summary: t("All codes ({n})", { n: UOM_CODES.length }),
    columns: ["Code", "Name", "Symbol", "Also written as"],
    wide: true,
    // A group row wherever the category changes.
    rows: UOM_CODES.flatMap((u, i) => [
      ...(u.category !== UOM_CODES[i - 1]?.category ? [{ group: u.category }] : []),
      { cells: [u.code, u.name, u.symbol ?? "", u.aliases.join(", ")] },
    ]),
  }),
};
