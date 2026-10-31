import { transformerFaultAmps } from "@uom/core/electrical";
import { amount, fmt, plain, typed } from "./format";
import { byRegion, type Converter, type RegionExamples } from "./model";
import { isNum, invalid } from "./checks";
import { phaseField, phaseName, readPhase, voltsField } from "./electrical-fields";
import { t } from "@uom/i18n";

export const fault: Converter = {
  id: "fault",
  topic: "Electrical",
  title: "Transformer fault current",
  blurb: "Full-load current and the maximum fault current at a transformer's secondary terminals, from kVA and nameplate impedance.",
  empty: "Enter the transformer kVA and its impedance (%Z).",
  note: "Assumes an infinite source (zero utility impedance), so real fault current is usually lower. The worst case takes %Z 10% under the nameplate, the UL 1561 tolerance from 25 kVA up, and adds 4 × motor full-load amps. Not a substitute for a short-circuit study, and the highest current isn't always the worst arc-flash case.",
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
    { kind: "number", id: "motor", label: "Motor load (full-load amps)", suffix: "A", optional: true, advanced: true },
    phaseField("3", true),
  ],
  compute(v) {
    const kva = v.num("kva");
    const volts = v.num("volts");
    const z = v.num("z");
    const motor = v.num("motor");
    const bad = invalid([
      ["kva", Number.isNaN(kva) || kva === 0],
      ["volts", !isNum(volts) || volts === 0],
      ["z", Number.isNaN(z) || (isNum(z) && (z <= 0 || z >= 100))],
      ["motor", Number.isNaN(motor)],
    ]);
    if (bad.length) return { error: "Enter numbers above 0; impedance is a percentage.", fields: bad };
    if (kva === undefined || z === undefined) return undefined;
    const phase = readPhase(v);
    const r = transformerFaultAmps(kva, volts!, phase, z, motor);
    const kA = (amps: number) => ({ detail: `${fmt(amps, 0)} A`, value: `${fmt(amps / 1000, 1)} kA`, copy: plain(amps, 0) });
    return {
      heading: `${fmt(kva, 1)} kVA, ${fmt(volts!, 1)} V ${phaseName(phase)}, ${fmt(z, 2)}%Z`,
      rows: [
        { label: "Worst-case fault current", ...kA(r.worstCase) },
        ...(phase === 1 ? [{ label: "Line-to-neutral, centre-tapped secondary", ...kA(r.lineToNeutral), status: "warn" as const }] : []),
        { label: "At nameplate %Z", ...kA(r.faultAmps) },
        ...(motor ? [{ label: "Motor contribution", ...kA(r.motorContribution) }] : []),
        { label: "Full-load current", ...amount(r.fla, 1, " A") },
      ],
      formula: [
        phase === 3 ? "Full-load amps = kVA × 1,000 ÷ (√3 × volts)." : "Full-load amps = kVA × 1,000 ÷ volts.",
        t("Fault current = full-load amps ÷ (%Z ÷ 100) = {fla} ÷ {z}.", { fla: fmt(r.fla, 1), z: fmt(z / 100, 4) }),
        "Worst case = fault current ÷ 0.9 + 4 × motor full-load amps.",
        ...(phase === 1 ? ["Line-to-neutral at a centre-tapped secondary's terminals can reach 1.5 × line-to-line."] : []),
      ],
    };
  },
};
