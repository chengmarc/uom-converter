import { describe, expect, it } from "vitest";
import { setNumberStyle } from "./format";
import { REGIONS } from "./regions";
import { dyn, exampleValues, type Values } from "./model";
import { TOOLS } from ".";

describe("converters", () => {
  it("have unique ids", () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Examples only need the region, so a stand-in for the panel's Values is enough.
  for (const r of REGIONS) {
    it(`examples set real fields and options (${r.label})`, () => {
      const v = { region: r.id } as Values;
      for (const t of TOOLS) {
        for (const ex of dyn(t.examples, v)) {
          for (const [id, value] of Object.entries(ex.set)) {
            const f = t.fields.find((x) => x.id === id);
            expect(f, `${t.id} "${ex.label}": field ${id}`).toBeDefined();
            if (f?.kind === "choice") expect(f.options.map((o) => o.value), `${t.id} "${ex.label}": ${id}`).toContain(value);
          }
        }
      }
    });
  }

  // Converters are shared by every app, so they must work with no page at all (tests run in
  // Node, with no DOM): every worked example gives an answer, and diagrams and tables are data.
  for (const r of REGIONS) {
    it(`work out every example without a page (${r.label})`, () => {
      setNumberStyle(r.number);
      for (const t of TOOLS) {
        for (const ex of dyn(t.examples, { region: r.id } as Values)) {
          const out = t.compute(exampleValues(t, ex.set, r.id));
          expect(out && "rows" in out, `${t.id} "${ex.label}": ${JSON.stringify(out)}`).toBe(true);
          if (out && "rows" in out) {
            expect(out.rows.length, `${t.id} "${ex.label}"`).toBeGreaterThan(0);
            expect(JSON.parse(JSON.stringify(out.visual ?? null)), `${t.id} "${ex.label}": visual`).toEqual(out.visual ?? null);
          }
        }
        if (t.table) expect(t.table().rows.length, t.id).toBeGreaterThan(0);
      }
    });
  }
});

describe("unit converters' common values", () => {
  it("list each value in every unit", () => {
    setNumberStyle(REGIONS[0].number);
    const table = tool("weight").table!();
    expect(table.columns).toEqual(["Pounds", "Kilograms"]);
    expect(table.rows).toContainEqual({ key: "lb:50", cells: ["50 lb", "22.68 kg"] });
  });

  it("highlight the row for the value entered", () => {
    expect(answer("weight", { value: "50", unit: "lb" })?.highlight).toBe("lb:50");
  });
});

describe("price per E/C/M", () => {
  it("keeps the unit code a capital in the heading: (M) is per 1,000, (m) would be a metre", () => {
    setNumberStyle(REGIONS[0].number);
    expect(answer("price", { price: "450", uom: "M" })?.heading).toBe("$450.00 per 1,000 (M) equals");
  });
});

const tool = (id: string) => TOOLS.find((t) => t.id === id)!;

/** A converter's answer in the US, for the given inputs over its defaults. */
function answer(id: string, set: Record<string, string>) {
  const out = tool(id).compute(exampleValues(tool(id), set, "us"));
  return out && "rows" in out ? out : undefined;
}
