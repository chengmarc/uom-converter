import { transformerFaultAmps, type Phase } from "../../src/electrical";
import { fmt, plain, typed } from "../format";
import type { Converter } from "../ui";
import { isNum, invalid, byRegion, phaseName, phaseField, voltsField, type RegionExamples } from "./shared";

export const fault: Converter = {
  id: "fault",
  topic: "Electrical",
  title: "Transformer fault current",
  blurb: "Full-load current and the maximum fault current at a transformer's secondary terminals, from kVA and nameplate impedance.",
  empty: "Enter the transformer kVA and its impedance (%Z).",
  note: "Assumes an infinite source (zero utility impedance), so this is the most the transformer can deliver; real fault current is lower. Nameplate %Z has a manufacturing tolerance, and a lower real impedance means more fault current. Not a substitute for a short-circuit study.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "1,000 kVA, 480 V, 5.75%Z", set: { kva: "1000", volts: "480", z: typed(5.75), phase: "3" } },
      { label: "75 kVA, 208 V, 4%Z", set: { kva: "75", volts: "208", z: "4", phase: "3" } },
    ],
    ca: [
      { label: "1,500 kVA, 600 V, 5.75%Z", set: { kva: "1500", volts: "600", z: typed(5.75), phase: "3" } },
      { label: "75 kVA, 208 V, 4%Z", set: { kva: "75", volts: "208", z: "4", phase: "3" } },
    ],
    eu: [
      { label: "1.000 kVA, 400 V, 6%Z", set: { kva: "1000", volts: "400", z: "6", phase: "3" } },
      { label: "630 kVA, 400 V, 4%Z", set: { kva: "630", volts: "400", z: "4", phase: "3" } },
    ],
  })),
  fields: [
    { kind: "number", id: "kva", label: "Transformer rating", suffix: "kVA", placeholder: "1000" },
    voltsField("Secondary voltage"),
    { kind: "number", id: "z", label: "Impedance", suffix: "%Z", placeholder: typed(5.75) },
    phaseField("3", true),
  ],
  compute(v) {
    const kva = v.num("kva");
    const volts = v.num("volts");
    const z = v.num("z");
    const bad = invalid([
      ["kva", Number.isNaN(kva) || kva === 0],
      ["volts", !isNum(volts) || volts === 0],
      ["z", Number.isNaN(z) || (isNum(z) && (z <= 0 || z >= 100))],
    ]);
    if (bad.length) return { error: "Enter numbers above 0; impedance is a percentage.", fields: bad };
    if (kva === undefined || z === undefined) return undefined;
    const phase = Number(v.str("phase")) as Phase;
    const r = transformerFaultAmps(kva, volts!, phase, z);
    return {
      heading: `${fmt(kva, 1)} kVA, ${fmt(volts!, 1)} V ${phaseName(phase)}, ${fmt(z, 2)}%Z`,
      rows: [
        { label: "Maximum fault current", detail: `${fmt(r.faultAmps, 0)} A`, value: `${fmt(r.faultAmps / 1000, 1)} kA`, copy: plain(r.faultAmps, 0) },
        { label: "Full-load current", value: `${fmt(r.fla, 1)} A`, copy: plain(r.fla, 1) },
      ],
      formula: [
        phase === 3 ? "Full-load amps = kVA × 1,000 ÷ (√3 × volts)." : "Full-load amps = kVA × 1,000 ÷ volts.",
        `Fault current = full-load amps ÷ (%Z ÷ 100) = ${fmt(r.fla, 1)} ÷ ${fmt(z / 100, 4)}.`,
      ],
    };
  },
};
