import { ampsToKva, kvaToAmps } from "../../src/electrical";
import { fmt, plain, typed } from "../format";
import { byRegion, type Converter, type RegionExamples } from "../ui";
import { isNum, invalid } from "./checks";
import { phaseField, phaseName, readPhase, voltsField } from "./electrical-fields";

const LOAD_UNITS = [
  { value: "kVA", label: "kVA", name: "Apparent power" },
  { value: "kW", label: "kW", name: "Real power" },
  { value: "A", label: "Amps", name: "Line current" },
];

export const load: Converter = {
  id: "load",
  topic: "Electrical",
  title: "kVA · kW · amps",
  blurb: "Transformer, generator and UPS sizing. Three-phase uses line-to-line volts.",
  empty: "Enter a value in kVA, kW or amps.",
  note: "Not for motors: motor full-load amps come from the code tables, not this formula.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "75 kVA at 208 V, 3-phase", set: { value: "75", unit: "kVA", volts: "208", phase: "3" } },
      { label: "100 A at 480 V, 3-phase", set: { value: "100", unit: "A", volts: "480", phase: "3" } },
      { label: "10 kW at 240 V, 1-phase", set: { value: "10", unit: "kW", volts: "240", phase: "1" } },
    ],
    ca: [
      { label: "45 kVA at 600 V, 3-phase", set: { value: "45", unit: "kVA", volts: "600", phase: "3" } },
      { label: "100 A at 600 V, 3-phase", set: { value: "100", unit: "A", volts: "600", phase: "3" } },
      { label: "10 kW at 240 V, 1-phase", set: { value: "10", unit: "kW", volts: "240", phase: "1" } },
    ],
    eu: [
      { label: "100 kVA at 400 V, 3-phase", set: { value: "100", unit: "kVA", volts: "400", phase: "3" } },
      { label: "32 A at 400 V, 3-phase", set: { value: "32", unit: "A", volts: "400", phase: "3" } },
      { label: `${fmt(7.4, 1)} kW at 230 V, 1-phase`, set: { value: typed(7.4), unit: "kW", volts: "230", phase: "1" } },
    ],
  })),
  fields: [
    { kind: "number", id: "value", label: "Value", placeholder: "75" },
    { kind: "choice", id: "unit", label: "Unit", options: LOAD_UNITS },
    voltsField("Volts"),
    phaseField("3"),
    { kind: "number", id: "pf", label: "Power factor", value: typed(1), advanced: true },
  ],
  compute(v) {
    const n = v.num("value");
    const volts = v.num("volts");
    const pf = v.num("pf");
    const bad = invalid([
      ["value", Number.isNaN(n)],
      ["volts", !isNum(volts) || volts === 0],
      ["pf", !isNum(pf) || pf <= 0 || pf > 1],
    ]);
    if (bad.length) return { error: "Enter numbers; volts more than 0, power factor between 0 and 1.", fields: bad };
    if (n === undefined) return undefined;
    const unit = v.str("unit");
    const phase = readPhase(v);
    const kva = unit === "kVA" ? n : unit === "kW" ? n / pf! : ampsToKva(n, volts!, phase);
    const values: Record<string, [number, string]> = {
      kVA: [kva, `${fmt(kva, 2)} kVA`],
      kW: [kva * pf!, `${fmt(kva * pf!, 2)} kW`],
      A: [kvaToAmps(kva, volts!, phase), `${fmt(kvaToAmps(kva, volts!, phase), 1)} A`],
    };
    // Amps is what people usually want, so it leads unless it's what they typed.
    const order = unit === "A" ? ["kVA", "kW"] : ["A", ...(unit === "kVA" ? ["kW"] : ["kVA"])];
    return {
      heading: `${values[unit][1]} at ${fmt(volts!, 1)} V ${phaseName(phase)}${pf !== 1 ? `, PF ${fmt(pf!, 2)}` : ""}`,
      rows: order.map((k) => ({ label: LOAD_UNITS.find((u) => u.value === k)!.name, value: values[k][1], copy: plain(values[k][0], 2) })),
      formula: ["Single-phase: amps = kVA × 1,000 ÷ volts.", "Three-phase: amps = kVA × 1,000 ÷ (√3 × line-to-line volts).", "kW = kVA × power factor."],
    };
  },
};
