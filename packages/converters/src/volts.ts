import { highLegVolts, lineToLine, lineToNeutral, readingBand, supplyRange, wyeSystem } from "@uom/core/electrical";
import type { Region } from "@uom/core/region";
import { regionInfo } from "./regions";
import { amount, fmt, plain } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row, type Status } from "./model";
import { t } from "@uom/i18n";

/** A meter reading against the limits for its nominal voltage. */
function readingRow(reading: number, nominal: number, region: Region, splitPhase: boolean): Row {
  const off = (reading / nominal - 1) * 100;
  const shown = { value: `${off > 0 ? "+" : ""}${fmt(off, 1)}%`, copy: plain(off, 1) };
  const range = supplyRange(nominal, region, splitPhase);
  if (!range) return { label: "Meter reading", detail: t("no published limits for a nominal {volts} V", { volts: fmt(nominal, 1) }), ...shown };
  const band = readingBand(reading, range);
  const limits = (l: [number, number]) => ({ low: fmt(l[0], 0), high: fmt(l[1], 0) });
  const detail =
    band === "normal" ? t("within the normal {low} to {high} V", limits(range.normal))
    : band === "extreme" ? t("outside the normal {low} to {high} V, within the extreme limits: should be corrected", limits(range.normal))
    : t("outside the limits, {low} to {high} V", limits(range.extreme));
  const status: Status = band === "normal" ? "good" : band === "extreme" ? "warn" : "bad";
  return { label: "Meter reading", detail, ...shown, status };
}

const limitSource = (region: Region) =>
  region === "us" ? t("Limits at the service: normal is ANSI C84.1 Range A, extreme is Range B.")
  : region === "ca" ? t("Limits at the service entrance, from CSA CAN3-C235-83 as utilities publish them. CSA C235:19 replaced that edition, so check with your utility.")
  : t("Limits at the supply terminals: ±10% (EN 50160).");

export const volts: Converter = {
  id: "volts",
  topic: "Electrical",
  title: "Line ↔ neutral voltage",
  blurb: "Three-phase systems: line-to-neutral = line-to-line ÷ √3. Check a meter reading against the limits for its nominal voltage.",
  empty: "Enter a voltage, like 208 or 347.",
  note: "120/240 V single-phase doesn't follow the √3 rule: choose it under System. Reading limits apply at the service: equipment further down also loses the voltage drop in its wiring.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "208 V line-to-line", set: { v: "208", from: "ll" } },
      { label: "480 V line-to-line", set: { v: "480", from: "ll" } },
      { label: "277 V line-to-neutral", set: { v: "277", from: "ln" } },
      { label: "Is 112 V OK on a 120 V circuit?", set: { v: "120", from: "ln", reading: "112" } },
      { label: "240 V delta with a high leg", set: { v: "240", from: "ll", system: "delta" } },
    ],
    ca: [
      { label: "600 V line-to-line", set: { v: "600", from: "ll" } },
      { label: "208 V line-to-line", set: { v: "208", from: "ll" } },
      { label: "347 V line-to-neutral", set: { v: "347", from: "ln" } },
      { label: "Is 112 V OK on a 120 V circuit?", set: { v: "120", from: "ln", reading: "112" } },
      { label: "240 V delta with a high leg", set: { v: "240", from: "ll", system: "delta" } },
    ],
    eu: [
      { label: "400 V line-to-line", set: { v: "400", from: "ll" } },
      { label: "690 V line-to-line", set: { v: "690", from: "ll" } },
      { label: "230 V line-to-neutral", set: { v: "230", from: "ln" } },
      { label: "Is 240 V OK on a 230 V circuit?", set: { v: "230", from: "ln", reading: "240" } },
    ],
  })),
  fields: [
    { kind: "number", id: "v", label: "Voltage", suffix: "V", placeholder: (v) => regionInfo(v.region).loadVolts, list: (v) => regionInfo(v.region).volts },
    {
      kind: "choice",
      id: "from",
      label: "Measured",
      options: [
        { value: "ll", label: "Line-to-line" },
        { value: "ln", label: "Line-to-neutral" },
      ],
    },
    { kind: "number", id: "reading", label: "Meter reading", suffix: "V", optional: true },
    {
      kind: "choice",
      id: "system",
      label: "System",
      advanced: true,
      options: [
        { value: "wye", label: "Wye (star)" },
        { value: "split", label: "Single-phase 120/240 V" },
        { value: "delta", label: "Delta, centre-tapped (high leg)" },
      ],
    },
  ],
  compute(v) {
    const n = v.num("v");
    if (n === undefined) return undefined;
    if (Number.isNaN(n) || n === 0) return { error: "Enter a voltage greater than 0.", fields: ["v"] };
    const reading = v.num("reading");
    if (Number.isNaN(reading) || reading === 0) return { error: "Enter a voltage greater than 0.", fields: ["reading"] };
    const wiring = v.str("system");
    const check = reading === undefined ? [] : [readingRow(reading, n, v.region, wiring === "split")];
    const checkFormula = reading === undefined ? [] : [limitSource(v.region)];
    if (wiring === "delta") {
      return {
        heading: t("{volts} V centre-tapped delta", { volts: fmt(n, 2) }),
        rows: [
          ...check,
          { label: "High leg to neutral", detail: "never feed a line-to-neutral load from it", ...amount(highLegVolts(n), 1, " V"), status: "warn" },
          { label: "Other two legs to neutral", ...amount(n / 2, 1, " V") },
          { label: "Line-to-line", ...amount(n, 1, " V") },
        ],
        formula: ["High leg to neutral = line-to-line × √3 ÷ 2.", "The other two legs sit either side of the centre tap: line-to-line ÷ 2.", ...checkFormula],
      };
    }
    const fromLL = v.str("from") === "ll";
    if (wiring === "split") {
      return {
        heading: fromLL ? t("{volts} V line-to-line equals", { volts: fmt(n, 2) }) : t("{volts} V line-to-neutral equals", { volts: fmt(n, 2) }),
        rows: [...check, { label: fromLL ? "Line-to-neutral" : "Line-to-line", ...amount(fromLL ? n / 2 : n * 2, 1, " V") }],
        formula: ["Single-phase 120/240 V: line-to-line = 2 × line-to-neutral.", ...checkFormula],
      };
    }
    const out = fromLL ? lineToNeutral(n) : lineToLine(n);
    const system = wyeSystem(n, v.region, fromLL ? "ll" : "ln");
    return {
      heading: fromLL ? t("{volts} V line-to-line equals", { volts: fmt(n, 2) }) : t("{volts} V line-to-neutral equals", { volts: fmt(n, 2) }),
      rows: [
        ...check,
        { label: fromLL ? "Line-to-neutral" : "Line-to-line", ...amount(out, 1, " V") },
        ...(system ? [{ label: "Standard system", value: `${system[0]}/${system[1]} V`, copy: `${system[0]}/${system[1]}` }] : []),
      ],
      formula: ["Line-to-neutral = line-to-line ÷ √3 (√3 ≈ 1.732).", ...checkFormula],
    };
  },
};
