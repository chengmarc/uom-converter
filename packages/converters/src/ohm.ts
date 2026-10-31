import { ohmsLaw, resistiveAt } from "@uom/core/electrical";
import { amount, fmt, plain } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row } from "./model";
import { t } from "@uom/i18n";

const OHM_FIELDS = [
  { id: "volts", label: "Volts", unit: "V", digits: 3 },
  { id: "amps", label: "Amps", unit: "A", digits: 3 },
  { id: "ohms", label: "Resistance", unit: "Ω", digits: 4 },
  { id: "watts", label: "Power", unit: "W", digits: 2 },
] as const;

/** Shown in milli- under 1, where three decimals would round a control circuit's current away. */
function shown(n: number, f: (typeof OHM_FIELDS)[number]) {
  const milli = n < 1 && f.id !== "ohms";
  return { ...amount(milli ? n * 1000 : n, f.digits, ` ${milli ? "m" : ""}${f.unit}`), copy: plain(n, 9) };
}

export const ohm: Converter = {
  id: "ohm",
  topic: "Electrical",
  title: "Ohm's law",
  blurb: "Enter any two of volts, amps, ohms and watts to get the other two, and what a heater gives on another voltage.",
  empty: "Fill in any two boxes.",
  note: "For DC and resistive loads (heaters, incandescent). Motors and other inductive loads also need power factor.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "1,500 W heater at 120 V", set: { volts: "120", watts: "1500" } },
      { label: "12 V, 2 A", set: { volts: "12", amps: "2" } },
      { label: "240 V across 20 Ω", set: { volts: "240", ohms: "20" } },
      { label: "4,800 W, 240 V heater on 208 V", set: { volts: "240", watts: "4800", at: "208" } },
    ],
    eu: [
      { label: "2.000 W kettle at 230 V", set: { volts: "230", watts: "2000" } },
      { label: "24 V, 2 A", set: { volts: "24", amps: "2" } },
      { label: "230 V across 50 Ω", set: { volts: "230", ohms: "50" } },
      { label: "2.000 W, 230 V heater on 207 V", set: { volts: "230", watts: "2000", at: "207" } },
    ],
  })),
  fields: [
    ...OHM_FIELDS.map((f) => ({ kind: "number" as const, id: f.id, label: f.label, suffix: f.unit, optional: true })),
    { kind: "number", id: "at", label: "Run on another voltage", suffix: "V", optional: true },
  ],
  compute(v) {
    const known: Record<string, number> = {};
    const bad: string[] = [];
    for (const f of OHM_FIELDS) {
      const n = v.num(f.id);
      if (n === undefined) continue;
      if (Number.isNaN(n) || n === 0) bad.push(f.id);
      else known[f.id] = n;
    }
    const at = v.num("at");
    if (Number.isNaN(at) || at === 0) bad.push("at");
    if (bad.length) return { error: "Enter numbers greater than 0.", fields: bad };
    const given = Object.keys(known);
    if (given.length < 2) return undefined;
    if (given.length > 2) return { error: "Only two values: clear one of the boxes.", fields: given };
    const r = ohmsLaw(known);
    if ("error" in r) return { error: r.error, fields: given };
    const describe = (id: string) => {
      const f = OHM_FIELDS.find((x) => x.id === id)!;
      return shown(known[id], f).value;
    };
    const off = at === undefined ? undefined : resistiveAt(r.watts, r.volts, at);
    const group = at === undefined ? "" : t("On {volts} V", { volts: fmt(at, 1) });
    const offRows: Row[] = off
      ? [
          { group, label: "Power", detail: t("{pct}% of its rating", { pct: fmt(off.share * 100, 1) }), ...shown(off.watts, OHM_FIELDS[3]), status: off.share > 1 ? "warn" : undefined },
          { group, label: "Amps", ...shown(off.amps, OHM_FIELDS[1]) },
        ]
      : [];
    return {
      heading: t("{a} and {b} gives", { a: describe(given[0]), b: describe(given[1]) }),
      rows: [
        ...OHM_FIELDS.filter((f) => !given.includes(f.id)).map((f) => ({
          label: f.label,
          ...shown(r[f.id], f),
        })),
        ...offRows,
      ],
      formula: ["Volts = amps × ohms.", "Watts = volts × amps = amps² × ohms = volts² ÷ ohms.", ...(off ? ["On another voltage, resistance holds, so power = rated watts × (volts ÷ rated volts)²."] : [])],
    };
  },
};
