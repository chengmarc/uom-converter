import { lookupUom, UOM_CODES } from "../../src/uom";
import type { Converter } from "../ui";

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
      heading: `“${raw}” is`,
      rows: [
        { label: "UN/ECE code", detail: u.note, value: u.code },
        { label: "Name", value: u.name },
        ...(u.symbol ? [{ label: "Symbol", value: u.symbol }] : []),
        { label: "Category", value: u.category },
      ],
      formula: ["UN/ECE Recommendation 20 unit codes; package types from Recommendation 21, written with an X prefix (XBX = box) as in the Peppol code list."],
    };
  },
  extra() {
    const details = document.createElement("details");
    details.className = "table-wrap";
    details.innerHTML = `<summary>All codes (${UOM_CODES.length})</summary><table class="wide"><thead><tr><th scope="col">Code</th><th scope="col">Name</th><th scope="col">Symbol</th><th scope="col">Also written as</th></tr></thead><tbody></tbody></table>`;
    let cat = "";
    for (const u of UOM_CODES) {
      if (u.category !== cat) {
        cat = u.category;
        const tr = document.createElement("tr");
        tr.className = "cat";
        tr.append(Object.assign(document.createElement("td"), { colSpan: 4, textContent: cat }));
        details.querySelector("tbody")!.append(tr);
      }
      const tr = document.createElement("tr");
      for (const t of [u.code, u.name, u.symbol ?? "", u.aliases.join(", ")]) tr.append(Object.assign(document.createElement("td"), { textContent: t }));
      details.querySelector("tbody")!.append(tr);
    }
    return details;
  },
};
