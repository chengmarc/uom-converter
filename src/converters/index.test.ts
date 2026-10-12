import { describe, expect, it } from "vitest";
import { parseNumber, setNumberStyle } from "./format";
import { REGIONS } from "./regions";
import { dyn, type Converter, type Values } from "./model";
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
          const out = t.compute(formValues(t, r.id, ex.set));
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

/** A form filled in the way the app fills it for an example: the example's values over each field's default. */
function formValues(t: Converter, region: Values["region"], set: Record<string, string>): Values {
  const v: Values = {
    region,
    str(id) {
      if (id in set) return set[id];
      const f = t.fields.find((x) => x.id === id)!;
      if (f.kind === "choice") return f.value === undefined ? f.options[0].value : dyn(f.value, v);
      return f.value === undefined ? "" : dyn(f.value, v);
    },
    num(id) {
      const f = t.fields.find((x) => x.id === id)!;
      return parseNumber(v.str(id), f.kind !== "choice" && f.signed);
    },
  };
  return v;
}
