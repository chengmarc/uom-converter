import { kvaToAmps } from "@uom/core/electrical";
import { amount, fmt, typed } from "./format";
import type { Converter, Example } from "./model";
import { invalid, isNum } from "./checks";
import { phaseField, phaseName, readPhase, voltsField } from "./electrical-fields";
import { t } from "@uom/i18n";

/** The power factor North American generators are rated at. */
const GENERATOR_PF = 0.8;

export const generator: Converter = {
  id: "generator",
  topic: "Electrical",
  title: "Generator & UPS sizing",
  blurb: "A set is limited by both kW and kVA. Check the load against each, and the largest motor start.",
  empty: "Enter the load in kW and its power factor.",
  note: "A first estimate: check the maker's sizing tool. Generators are usually rated at 0.8 PF, UPS units at 0.9 or higher, so set the rated power factor to match. Motor starting kVA is on the motor's code letter, or about 6 kVA per hp across the line.",
  examples: (): Example[] => [
    { label: "100 kW load at 0.85 PF", set: { kw: "100", pf: typed(0.85) } },
    { label: t("{kw} kW at PF {pf}, 60 kVA motor start", { kw: 80, pf: fmt(0.9, 2) }), set: { kw: "80", pf: typed(0.9), start: "60" } },
  ],
  fields: [
    { kind: "number", id: "kw", label: "Running load", suffix: "kW", placeholder: "100" },
    { kind: "number", id: "pf", label: "Load power factor", placeholder: () => typed(0.85) },
    { kind: "number", id: "start", label: "Largest motor starting", suffix: "kVA", optional: true },
    { ...voltsField("Volts (for current)"), value: undefined, optional: true },
    phaseField("3", true),
    { kind: "number", id: "rated", label: "Set's rated power factor", value: () => typed(GENERATOR_PF), advanced: true },
    { kind: "number", id: "margin", label: "Spare capacity", suffix: "%", value: "20", advanced: true },
  ],
  compute(v) {
    const kw = v.num("kw");
    const pf = v.num("pf");
    const start = v.num("start");
    const volts = v.num("volts");
    const rated = v.num("rated");
    const margin = v.num("margin");
    const pfBad = (p: number | undefined) => Number.isNaN(p) || (isNum(p) && (p <= 0 || p > 1));
    const bad = invalid([
      ["kw", Number.isNaN(kw) || kw === 0],
      ["pf", pfBad(pf)],
      ["start", Number.isNaN(start)],
      ["volts", Number.isNaN(volts) || volts === 0],
      ["rated", !isNum(rated) || pfBad(rated)],
      ["margin", !isNum(margin)],
    ]);
    if (bad.length) return { error: "Enter numbers; power factors are between 0 and 1.", fields: bad };
    if (kw === undefined || pf === undefined) return undefined;
    const kva = kw / pf;
    const withStart = kva + (start ?? 0);
    const needKva = Math.max(kw / rated!, kva, withStart) * (1 + margin! / 100);
    const phase = readPhase(v);
    return {
      heading: t("{kw} kW at PF {pf}", { kw: fmt(kw, 1), pf: fmt(pf, 2) }),
      rows: [
        { label: "Set size, at least", detail: t("with {pct}% spare", { pct: fmt(margin!, 0) }), value: `${fmt(needKva, 1)} kVA / ${fmt(needKva * rated!, 1)} kW` },
        { label: "Running kVA", ...amount(kva, 1, " kVA") },
        ...(start === undefined ? [] : [{ label: "Running plus motor start", ...amount(withStart, 1, " kVA") }]),
        ...(volts === undefined ? [] : [{ label: "Set current at this size", detail: t("at {volts} V {phase}", { volts: fmt(volts, 1), phase: phaseName(phase) }), ...amount(kvaToAmps(needKva, volts, phase), 1, " A") }]),
      ],
      formula: ["Running kVA = kW ÷ load power factor.", "Set kVA is the largest of kW ÷ rated power factor, running kVA, and running kVA + motor start, plus spare capacity."],
    };
  },
};
