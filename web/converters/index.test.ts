import { describe, expect, it } from "vitest";
import { REGIONS } from "../regions";
import { dyn, type Values } from "../ui";
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
});
