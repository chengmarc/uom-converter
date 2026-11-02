import { cecTransformerPrimary, kvaToAmps, necTransformerProtection, nextTransformerKva } from "@uom/core/electrical";
import { amount, fmt } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row } from "./model";
import { invalid, isNum } from "./checks";
import { codeField, phaseField, phaseName, readCode, readPhase } from "./electrical-fields";
import { t } from "@uom/i18n";

const amps = (a: number | undefined) => (a === undefined ? { value: t("Under 15 A or over 2000 A"), copy: "" } : { value: `${a} A`, copy: String(a) });

export const transformer: Converter = {
  id: "transformer",
  topic: "Equipment",
  title: "Transformer sizing",
  blurb: "Primary and secondary amps, the next common size, and the overcurrent protection allowed.",
  empty: "Enter the kVA and both voltages.",
  note: (v) =>
    v.region === "ca"
      ? "For dry-type transformers of 750 V or less. The CEC's rule numbers have moved between editions, so check Section 26 in yours. Size the primary device to ride through inrush: about 12 times rated current for 0.1 s."
      : "NEC Table 450.3(B), for 600 V or less. Size the primary device to ride through inrush. Secondary conductors have their own tap rules: check them separately.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "75 kVA, 480 V to 208 V", set: { kva: "75", primary: "480", secondary: "208", phase: "3" } },
      { label: "30 kVA, 480 V to 208 V", set: { kva: "30", primary: "480", secondary: "208", phase: "3" } },
      { label: "10 kVA, 240 V to 120 V, 1-phase", set: { kva: "10", primary: "240", secondary: "120", phase: "1" } },
    ],
    ca: [
      { label: "75 kVA, 600 V to 208 V", set: { kva: "75", primary: "600", secondary: "208", phase: "3" } },
      { label: "45 kVA, 600 V to 208 V", set: { kva: "45", primary: "600", secondary: "208", phase: "3" } },
    ],
  })),
  fields: [
    { kind: "number", id: "kva", label: "Transformer rating or load", suffix: "kVA", placeholder: "75" },
    { kind: "number", id: "primary", label: "Primary voltage", suffix: "V", placeholder: "480" },
    { kind: "number", id: "secondary", label: "Secondary voltage", suffix: "V", placeholder: "208" },
    phaseField("3"),
    codeField(true),
  ],
  compute(v) {
    const kva = v.num("kva");
    const primary = v.num("primary");
    const secondary = v.num("secondary");
    const bad = invalid([
      ["kva", Number.isNaN(kva) || kva === 0],
      ["primary", Number.isNaN(primary) || primary === 0],
      ["secondary", Number.isNaN(secondary) || secondary === 0],
    ]);
    if (bad.length) return { error: "Enter numbers above 0.", fields: bad };
    if (!isNum(kva) || !isNum(primary) || !isNum(secondary)) return undefined;
    const phase = readPhase(v);
    const ip = kvaToAmps(kva, primary, phase);
    const is = kvaToAmps(kva, secondary, phase);
    const next = nextTransformerKva(kva, phase);
    const rows: Row[] = [
      { label: "Primary current", ...amount(ip, 1, " A") },
      { label: "Secondary current", ...amount(is, 1, " A") },
      { label: "Next common size", detail: "dry-type, check the maker's list", value: next === undefined ? t("Over the usual sizes") : `${fmt(next, 1)} kVA`, copy: next === undefined ? "" : String(next) },
    ];
    const g = t("Overcurrent protection");
    if (readCode(v) === "cec") {
      rows.push(
        { group: g, label: "Primary device", detail: "125% of primary current, next size up", ...amps(cecTransformerPrimary(ip)) },
        { group: g, label: "Secondary conductors", detail: "at least 125% of secondary current", ...amount(is * 1.25, 1, " A") },
      );
    } else {
      const p = necTransformerProtection(ip, is);
      rows.push(
        { group: g, label: "Primary device, primary protection only", ...amps(p.primaryOnly) },
        { group: g, label: "Primary device, with secondary protection", detail: "up to 250% of primary current", ...amps(p.primaryWithSecondary) },
        { group: g, label: "Secondary device", ...amps(p.secondary) },
      );
    }
    return {
      heading: t("{kva} kVA, {primary} V to {secondary} V {phase}", { kva: fmt(kva, 1), primary: fmt(primary, 1), secondary: fmt(secondary, 1), phase: phaseName(phase) }),
      rows,
      formula: [
        phase === 3 ? "Amps = kVA × 1,000 ÷ (√3 × volts)." : "Amps = kVA × 1,000 ÷ volts.",
        readCode(v) === "cec"
          ? "CEC: primary device at 125% of rated primary current, or the next size up."
          : "NEC, primary only: 125% from 9 A (next size up), 167% from 2 A, 300% under 2 A. With secondary protection: primary up to 250%, secondary 125%, or 167% under 9 A.",
      ],
    };
  },
};
