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
  // 12 AWG copper at 16 A, 120 V single-phase, against the default 3% target: 50 ft drops 2.67%,
  // 70 ft 3.73%, 100 ft 5.33%.
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
    expect(drop({ len: "3000", amps: "400" }).rows[3]).toMatchObject({ value: "Over 2000 kcmil", detail: "add parallel sets, or shorten the run", status: "warn" });
  });

  it("says a size for drop alone is no ampacity check", () => {
    const row = drop({ len: "60", size: "3/0", amps: "150", volts: "600", phase: "3" }, "ca").rows[3];
    expect(row).toMatchObject({ label: "Smallest size for voltage drop only", detail: "not an ampacity check: confirm it's rated for 150 A", status: "warn" });
  });

  it("never suggests a size a circuit can't be run in", () => {
    const short = { len: "3", amps: "1" };
    expect(drop(short).rows[3].value).toBe("14 AWG");
    expect(drop({ ...short, metal: "Al" }).rows[3].value).toBe("12 AWG");
    expect(drop({ ...short, size: "2.5", sys: "mm2" }, "eu").rows[3].value).toBe("1,5 mm²");
    expect(drop({ ...short, size: "16", sys: "mm2", metal: "Al" }, "eu").rows[3].value).toBe("10 mm²");
  });

  it("is bad over 3% in Canada, where that's a limit and not a suggestion", () => {
    expect(drop({ len: "30" }, "ca").rows[0]).toMatchObject({ status: "bad", detail: "over 3%" });
    expect(drop({ len: "30", target: "6" }, "ca").rows[0]).toMatchObject({ status: "bad" });
    expect(drop({ len: "15", target: "2" }, "ca").rows[0]).toMatchObject({ status: "warn" });
  });

  it("reads higher on a large conductor than DC resistance would", () => {
    const feeder = { size: "500 kcmil", len: "300", amps: "380", volts: "480", phase: "3", pf: "0.85" };
    expect(Number.parseFloat(drop(feeder).rows[0].value)).toBeCloseTo(2.06, 1);
  });

  it("shares the drop between parallel sets, and says so in the heading", () => {
    const out = drop({ size: "500 kcmil", len: "300", amps: "760", volts: "480", phase: "3", sets: "2" });
    expect(out.heading).toContain("2 × 500 kcmil");
  });

  it("refuses a part set or a power factor over 1", () => {
    const set = { size: "12", amps: "16", volts: "120", len: "50" };
    expect(output("vdrop", { ...set, sets: "1.5" })).toMatchObject({ fields: ["sets"] });
    expect(output("vdrop", { ...set, pf: "1.2" })).toMatchObject({ fields: ["pf"] });
  });

  it("measures runs in feet in the US and metres elsewhere", () => {
    expect(drop({ len: "100" }).heading).toContain("100 ft");
    expect(drop({ len: "100" }, "ca").heading).toContain("100 m");
  });
});

describe("line and neutral voltage", () => {
  it("names a standard system only for the side measured", () => {
    expect(answer("volts", { v: "400", from: "ll" }, "eu")!.rows[1]).toMatchObject({ label: "Standard system", value: "230/400 V" });
    expect(answer("volts", { v: "400", from: "ln" }, "eu")!.rows[1]).toMatchObject({ value: "400/690 V" });
    expect(answer("volts", { v: "208", from: "ln" })!.rows).toHaveLength(1);
  });
});

describe("meter readings", () => {
  const reading = (set: Record<string, string>, region: Region = "us") => answer("volts", { from: "ln", ...set }, region)!.rows[0];

  it("leads with the reading against the limits for its nominal", () => {
    expect(reading({ v: "120", reading: "118" })).toMatchObject({ label: "Meter reading", value: "-1.7%", status: "good" });
  });

  it("warns outside normal, and is bad outside the extreme limits", () => {
    expect(reading({ v: "120", reading: "112" })).toMatchObject({ status: "warn" });
    expect(reading({ v: "120", reading: "105" })).toMatchObject({ status: "bad" });
  });

  it("uses each region's own limits: 112 V is normal in Canada, not in the US", () => {
    expect(reading({ v: "120", reading: "112" }, "ca")).toMatchObject({ status: "good" });
  });

  it("judges a Canadian 120 V reading by the system it's on", () => {
    expect(reading({ v: "120", reading: "111" }, "ca")).toMatchObject({ status: "warn" });
    expect(reading({ v: "120", reading: "111", system: "split" }, "ca")).toMatchObject({ status: "good" });
  });

  it("says when it has no limits, without passing judgment", () => {
    const row = reading({ v: "230", reading: "225" });
    expect(row.detail).toContain("no published limits");
    expect(row.status).toBeUndefined();
  });

  it("refuses a reading of 0", () => {
    expect(output("volts", { v: "120", reading: "0" })).toMatchObject({ fields: ["reading"] });
  });
});

describe("single-phase 120/240 V", () => {
  it("doubles or halves, with no √3 and no wye system named", () => {
    const rows = answer("volts", { v: "240", from: "ll", system: "split" })!.rows;
    expect(rows).toEqual([expect.objectContaining({ label: "Line-to-neutral", value: "120 V" })]);
  });
});

describe("centre-tapped delta", () => {
  it("gives the high leg and warns against loading it", () => {
    const rows = answer("volts", { v: "240", from: "ll", system: "delta" })!.rows;
    expect(rows[0]).toMatchObject({ label: "High leg to neutral", value: "207.8 V", status: "warn" });
    expect(rows[1]).toMatchObject({ label: "Other two legs to neutral", value: "120 V" });
  });
});

describe("box fill", () => {
  const set = { code: "nec", unit: "in3", c14: "4", devices: "1" };

  it("fits when the contents are within the box", () => {
    const rows = answer("box-fill", { ...set, box: "18" })!.rows;
    expect(rows[0]).toMatchObject({ label: "Fits the box", status: "good" });
    expect(rows[1]).toMatchObject({ value: "12 in³", detail: "196.6 mL" });
  });

  it("is too full, and says by how much", () => {
    const rows = answer("box-fill", { ...set, box: "10" })!.rows;
    expect(rows[0]).toMatchObject({ label: "Too full", status: "bad" });
    expect(rows.find((r) => r.label === "Short by")).toMatchObject({ value: "2 in³" });
  });

  it("gives the volume needed with no box entered", () => {
    expect(answer("box-fill", set)!.rows[0]).toMatchObject({ label: "Minimum box volume", value: "12 in³" });
  });

  it("takes the box in either unit, whichever code is used", () => {
    const rows = answer("box-fill", { ...set, unit: "ml", box: "295" })!.rows;
    expect(rows.find((r) => r.label === "Box volume")).toMatchObject({ value: "18 in³" });
  });

  it("defaults to each region's code and unit", () => {
    expect(answer("box-fill", { c14: "4" }, "ca")!.heading).toBe("Box fill by the CEC");
    expect(answer("box-fill", { c14: "4" })!.heading).toBe("Box fill by the NEC");
  });

  it("refuses part of a conductor", () => {
    expect(output("box-fill", { c14: "1.5" })).toMatchObject({ fields: ["c14"] });
  });

  it("waits for a conductor", () => {
    expect(output("box-fill", { devices: "1" })).toBeUndefined();
  });

  it("says IEC has no such calculation", () => {
    const note = tool("box-fill").note as (v: Values) => string;
    expect(note({ region: "eu" } as Values)).toContain("IEC 60364");
  });
});

describe("a heater on another voltage", () => {
  it("shows the power and current at that voltage", () => {
    const rows = answer("ohm", { volts: "240", watts: "4800", at: "208" })!.rows;
    const group = "On 208 V";
    expect(rows.find((r) => r.group === group && r.label === "Power")).toMatchObject({ value: "3,605.33 W", detail: "75.1% of its rating" });
    expect(rows.find((r) => r.group === group && r.label === "Amps")).toMatchObject({ value: "17.333 A" });
  });

  it("warns when it's overdriven", () => {
    expect(answer("ohm", { volts: "208", watts: "3000", at: "240" })!.rows.find((r) => r.label === "Power" && r.group)).toMatchObject({ status: "warn" });
  });

  it("refuses a voltage of 0", () => {
    expect(output("ohm", { volts: "240", watts: "4800", at: "0" })).toMatchObject({ fields: ["at"] });
  });
});

describe("power", () => {
  it("converts tons of cooling and metric horsepower", () => {
    expect(answer("power", { value: "1", unit: "ton" })!.rows[0]).toMatchObject({ label: "BTU per hour", value: "12,000 BTU/h" });
    expect(answer("power", { value: "100", unit: "ps" })!.rows[0]).toMatchObject({ label: "Kilowatts", value: "73.55 kW" });
  });
});

describe("length", () => {
  it("takes feet and inches as plans write them, whichever unit is selected", () => {
    const out = answer("length", { value: `12'-6"`, unit: "m" })!;
    expect(out.heading).toBe(`12'-6" equals`);
    expect(out.rows.find((r) => r.label === "Metres")).toMatchObject({ value: "3.81 m" });
    expect(out.rows.find((r) => r.label === "Feet")).toMatchObject({ value: "12.5 ft" });
  });

  it("shows any length in feet and inches", () => {
    expect(answer("length", { value: "3.81", unit: "m" })!.rows.find((r) => r.label === "Feet and inches")).toMatchObject({ value: `12'-6"` });
  });

  it("still takes a plain number, and a decimal comma in Europe", () => {
    expect(answer("length", { value: "10", unit: "ft" })!.rows[0]).toMatchObject({ label: "Metres" });
    expect(answer("length", { value: "1,5", unit: "m" }, "eu")!.rows[0]).toMatchObject({ label: "Feet" });
  });

  it("refuses what it can't read", () => {
    expect(output("length", { value: `12'-x"`, unit: "ft" })).toMatchObject({ fields: ["value"] });
  });
});

describe("kVA, kW and amps", () => {
  it("won't turn kW into amps without a power factor", () => {
    expect(output("load", { value: "100", unit: "kW", volts: "480" })).toBeUndefined();
    expect(answer("load", { value: "100", unit: "kW", volts: "480", pf: "0.8" })!.rows[0]).toMatchObject({ value: "150.4 A" });
  });

  it("leaves kW out when there's no power factor to work it from", () => {
    const out = answer("load", { value: "75", unit: "kVA", volts: "208" })!;
    expect(out.rows.map((r) => r.label)).toEqual(["Line current"]);
    expect(out.heading).not.toContain("PF");
  });
});

describe("transformer fault current", () => {
  const set = { kva: "1000", volts: "480", z: "5.75" };

  it("leads with the worst case, not the nameplate figure", () => {
    const rows = answer("fault", set)!.rows;
    expect(rows[0]).toMatchObject({ label: "Worst-case fault current", value: "23.2 kA" });
    expect(rows[1]).toMatchObject({ label: "At nameplate %Z", value: "20.9 kA" });
  });

  it("adds motor contribution to the worst case", () => {
    const rows = answer("fault", { ...set, motor: "600" })!.rows;
    expect(rows[0].value).toBe("25.6 kA");
    expect(rows.find((r) => r.label === "Motor contribution")).toMatchObject({ value: "2.4 kA" });
  });

  it("warns about line-to-neutral on a single-phase secondary only", () => {
    const label = "Line-to-neutral, centre-tapped secondary";
    expect(answer("fault", { kva: "50", volts: "240", z: "2", phase: "1" })!.rows[1]).toMatchObject({ label, value: "17.4 kA", status: "warn" });
    expect(answer("fault", set)!.rows.map((r) => r.label)).not.toContain(label);
  });
});

describe("wire coils and reels", () => {
  it("takes each pull whole from one reel", () => {
    expect(answer("reels", { unit: "ft", run: "300", count: "3", size: "500" })!.rows[0]).toMatchObject({ value: "3" });
  });

  it("adds the termination allowance to every pull", () => {
    const rows = answer("reels", { unit: "ft", run: "245", count: "2", size: "500", extra: "10" })!.rows;
    expect(rows[0].value).toBe("2");
    expect(rows[2].value).toBe("510 ft");
  });

  it("refuses a pull longer than a reel", () => {
    expect(output("reels", { unit: "ft", run: "600", count: "1", size: "500" })).toMatchObject({ fields: ["run", "size"] });
  });
});

describe("motor speed and slip", () => {
  it("warns about a slip no induction motor runs at", () => {
    expect(answer("motor", { hz: "60", rpm: "1450" }, "ca")!.rows.find((r) => r.label === "Slip")).toMatchObject({ status: "warn" });
    expect(answer("motor", { hz: "60", rpm: "1750" })!.rows.find((r) => r.label === "Slip")!.status).toBeUndefined();
  });

  it("keeps the same r/min below synchronous on the other frequency", () => {
    const rows = answer("motor", { hz: "60", rpm: "1750" })!.rows;
    expect(rows.find((r) => r.label === "Running speed, about")).toMatchObject({ value: "1,450 r/min" });
  });
});

describe("wire size conversion", () => {
  it("leads with a size at least as big, since the nearest can be smaller", () => {
    expect(answer("mm2", { area: "2.5" })!.rows[0]).toMatchObject({ label: "Smallest size at least as big", value: "12 AWG" });
    const metric = answer("awg", { size: "1/0" })!.rows.filter((r) => r.group === "Metric wire size (IEC)");
    expect(metric[0]).toMatchObject({ label: "Smallest size at least as big", value: "70 mm²" });
  });
});

describe("conduit and knockouts", () => {
  it("doesn't pass a European M size off as a trade size", () => {
    const out = answer("conduit", { size: "M16" }, "eu")!;
    expect(out.rows[0]).toMatchObject({ label: "Clearance hole, typical", value: "16,5 mm" });
    expect(output("conduit", { size: "M35" }, "eu")).toMatchObject({ fields: ["size"] });
  });

  it("keeps the M prefix as a designator in North America", () => {
    expect(answer("conduit", { size: "M16" }, "ca")!.rows[0]).toMatchObject({ label: "Inch trade size", value: '1/2"' });
  });

  it("takes a decimal comma in Europe", () => {
    expect(answer("conduit", { size: "1,25" }, "eu")!.rows[0]).toMatchObject({ value: "35" });
  });
});

describe("power factor correction's current", () => {
  it("shows line current only for a voltage someone entered", () => {
    const set = { kw: "100", pf1: "0.8" };
    expect(answer("pf", set)!.rows.map((r) => r.label)).not.toContain("Line current");
    expect(answer("pf", { ...set, volts: "480" })!.rows.map((r) => r.label)).toContain("Line current");
  });
});

describe("list and multiplier", () => {
  it("takes a decimal comma in a European discount chain", () => {
    expect(answer("multiplier", { kind: "disc", value: "50/7,5", list: "100" }, "eu")!.rows[0]).toMatchObject({ label: "Net price", value: "46,25 €" });
  });
});

describe("spec value to metric", () => {
  it("takes a decimal comma in Europe", () => {
    expect(answer("metric", { spec: "1,5 mm2" }, "eu")!.rows[0]).toMatchObject({ value: "1,5 mm²" });
  });
});

describe("Ohm's law", () => {
  it("shows small values in milli-, not rounded away", () => {
    expect(answer("ohm", { volts: "12", ohms: "10000" })!.rows[0]).toMatchObject({ value: "1.2 mA", copy: "0.0012" });
    expect(answer("ohm", { volts: "5", ohms: "100000" })!.rows[1]).toMatchObject({ value: "0.25 mW" });
  });

  it("shows ohms as they are", () => {
    expect(answer("ohm", { volts: "1", amps: "10" })!.rows[0]).toMatchObject({ value: "0.1 Ω" });
  });
});

describe("UOM mix-up check", () => {
  it("names a unit mix-up, and doesn't rule one out too firmly", () => {
    expect(answer("mixup", { a: "1", b: "3.28" })!.rows[0]).toMatchObject({ label: "Likely UOM mix-up", value: "3.28× apart" });
    expect(answer("mixup", { a: "10", b: "12" })!.rows[0]).toMatchObject({ label: "No common mix-up ratio", detail: expect.stringContaining("Probably") });
  });

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
