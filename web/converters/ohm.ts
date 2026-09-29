import { ohmsLaw } from "../../src/electrical";
import { fmt, plain } from "../format";
import { byRegion, type Converter, type RegionExamples } from "../ui";

const OHM_FIELDS = [
  { id: "volts", label: "Volts", unit: "V", digits: 3 },
  { id: "amps", label: "Amps", unit: "A", digits: 3 },
  { id: "ohms", label: "Resistance", unit: "Ω", digits: 4 },
  { id: "watts", label: "Power", unit: "W", digits: 2 },
] as const;

export const ohm: Converter = {
  id: "ohm",
  topic: "Electrical",
  title: "Ohm's law",
  blurb: "Enter any two of volts, amps, ohms and watts to get the other two.",
  empty: "Fill in any two boxes.",
  note: "For DC and resistive loads (heaters, incandescent). Motors and other inductive loads also need power factor.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "1,500 W heater at 120 V", set: { volts: "120", watts: "1500" } },
      { label: "12 V, 2 A", set: { volts: "12", amps: "2" } },
      { label: "240 V across 20 Ω", set: { volts: "240", ohms: "20" } },
    ],
    eu: [
      { label: "2.000 W kettle at 230 V", set: { volts: "230", watts: "2000" } },
      { label: "24 V, 2 A", set: { volts: "24", amps: "2" } },
      { label: "230 V across 50 Ω", set: { volts: "230", ohms: "50" } },
    ],
  })),
  fields: OHM_FIELDS.map((f) => ({ kind: "number" as const, id: f.id, label: f.label, suffix: f.unit, optional: true })),
  compute(v) {
    const known: Record<string, number> = {};
    const bad: string[] = [];
    for (const f of OHM_FIELDS) {
      const n = v.num(f.id);
      if (n === undefined) continue;
      if (Number.isNaN(n) || n === 0) bad.push(f.id);
      else known[f.id] = n;
    }
    if (bad.length) return { error: "Enter numbers greater than 0.", fields: bad };
    const given = Object.keys(known);
    if (given.length < 2) return undefined;
    if (given.length > 2) return { error: "Only two values: clear one of the boxes.", fields: given };
    const r = ohmsLaw(known);
    if ("error" in r) return { error: r.error, fields: given };
    const describe = (id: string) => {
      const f = OHM_FIELDS.find((x) => x.id === id)!;
      return `${fmt(known[id], f.digits)} ${f.unit}`;
    };
    return {
      heading: `${describe(given[0])} and ${describe(given[1])} gives`,
      rows: OHM_FIELDS.filter((f) => !given.includes(f.id)).map((f) => ({
        label: f.label,
        value: `${fmt(r[f.id], f.digits)} ${f.unit}`,
        copy: plain(r[f.id], f.digits),
      })),
      formula: ["Volts = amps × ohms.", "Watts = volts × amps = amps² × ohms = volts² ÷ ohms."],
    };
  },
};
