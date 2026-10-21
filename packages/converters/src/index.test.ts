import { describe, expect, it } from "vitest";
import { setNumberStyle } from "./format";
import type { Region } from "@uom/core/region";
import { regionInfo, REGIONS } from "./regions";
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
    expect(answer("price", { price: "450", uom: "M" })?.heading).toBe("$450.00 per 1,000 (M) equals");
  });
});

describe("voltage drop", () => {
  // 12 AWG copper at 16 A, 120 V single-phase, against the default 3% target: 50 ft drops 2.58%,
  // 70 ft 3.61%, 100 ft 5.15%.
  const drop = (set: Record<string, string>, region: Region = "us") =>
    answer("vdrop", { size: "12", amps: "16", volts: "120", ...set }, region)!;

  it("is good within the target", () => {
    expect(drop({ len: "50" }).rows[0]).toMatchObject({ status: "good", detail: "within your 3% target" });
  });

  it("warns between the target and 5%", () => {
    expect(drop({ len: "70" }).rows[0]).toMatchObject({ status: "warn", detail: "over your 3% target" });
  });

  it("is bad over 5%", () => {
    expect(drop({ len: "100" }).rows[0]).toMatchObject({ status: "bad", detail: "over 5%" });
  });

  it("has no warning band when the target is 5% or more", () => {
    const out = drop({ len: "100", target: "6" });
    expect(out.rows[0]).toMatchObject({ status: "good", detail: "within your 6% target" });
    expect(out.visual).toMatchObject({ marks: [{ at: 6 }] });
  });

  it("warns when no listed size meets the target", () => {
    expect(drop({ len: "3000", amps: "400" }).rows[3]).toMatchObject({ value: "Over 1000 kcmil", status: "warn" });
  });

  it("measures runs in feet in the US and metres elsewhere", () => {
    expect(drop({ len: "100" }).heading).toContain("100 ft");
    expect(drop({ len: "100" }, "ca").heading).toContain("100 m");
  });
});

describe("UOM mix-up check", () => {
  it("corrects whichever price is the higher one", () => {
    expect(answer("mixup", { a: "1.25", b: "125" })!.rows[2]).toMatchObject({ label: "B corrected", value: "$1.25" });
    expect(answer("mixup", { a: "450", b: "0.46" })!.rows[2]).toMatchObject({ label: "A corrected", value: "$0.45" });
  });
});

describe("boxes & packs", () => {
  it("warns when whole packs leave some over", () => {
    expect(answer("packs", { need: "250", size: "100" })!.rows[1]).toMatchObject({ value: "300 each", status: "warn" });
    expect(answer("packs", { need: "300", size: "100" })!.rows[1]).toMatchObject({ status: "good" });
  });
});

describe("packaging levels", () => {
  it("refuses a case that doesn't divide into whole inner packs", () => {
    expect(output("packaging", { case: "100", inner: "12" })).toMatchObject({ fields: ["inner", "case"] });
  });
});

describe("power factor correction", () => {
  it("refuses a target that isn't higher than the present power factor", () => {
    expect(output("pf", { kw: "100", pf1: "0.9", pf2: "0.85" })).toMatchObject({ fields: ["pf2"] });
    expect(output("pf", { kw: "100", pf1: "0.9", pf2: "0.9" })).toMatchObject({ fields: ["pf2"] });
  });
});

const tool = (id: string) => TOOLS.find((t) => t.id === id)!;

/** What a converter gives in a region for the given inputs over its defaults, read and shown in the region's number style. */
function output(id: string, set: Record<string, string>, region: Region = "us") {
  setNumberStyle(regionInfo(region).number);
  return tool(id).compute(exampleValues(tool(id), set, region));
}

/** The same, when it's an answer (not an error, or nothing yet). */
function answer(id: string, set: Record<string, string>, region: Region = "us") {
  const out = output(id, set, region);
  return out && "rows" in out ? out : undefined;
}
