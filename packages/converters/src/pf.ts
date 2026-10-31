import { capacitorRatedKvar, kvaToAmps, pfCorrectionKvar } from "@uom/core/electrical";
import { amount, fmt, typed } from "./format";
import type { Converter, Example, Row } from "./model";
import { isNum, invalid } from "./checks";
import { phaseField, phaseName, readPhase, voltsField } from "./electrical-fields";
import { t } from "@uom/i18n";

export const pf: Converter = {
  id: "pf",
  topic: "Electrical",
  title: "Power factor correction",
  blurb: "Capacitor kvar needed to raise a load's power factor, and what it does to kVA and current.",
  empty: "Enter the load in kW and its present power factor.",
  note: "Round up to the next standard capacitor size. Don't correct past unity, and check for harmonic resonance on sites with drives or other non-linear loads.",
  examples: (): Example[] => [
    { label: t("{kw} kW from PF {from} to {to}", { kw: 100, from: fmt(0.8, 2, 2), to: fmt(0.95, 2) }), set: { kw: "100", pf1: typed(0.8), pf2: typed(0.95) } },
    { label: t("{kw} kW from PF {from} to {to}", { kw: 250, from: fmt(0.72, 2), to: fmt(0.95, 2) }), set: { kw: "250", pf1: typed(0.72), pf2: typed(0.95) } },
    { label: t("{kw} kW from PF {from} to {to}", { kw: 40, from: fmt(0.85, 2), to: fmt(0.98, 2) }), set: { kw: "40", pf1: typed(0.85), pf2: typed(0.98) } },
  ],
  fields: [
    { kind: "number", id: "kw", label: "Real power", suffix: "kW", placeholder: "100" },
    { kind: "number", id: "pf1", label: "Present power factor", placeholder: typed(0.8) },
    { kind: "number", id: "pf2", label: "Target power factor", value: typed(0.95) },
    { ...voltsField("Volts (for current)"), value: undefined, optional: true, advanced: true },
    phaseField("3", true),
    { kind: "number", id: "capVolts", label: "Capacitor rated voltage", suffix: "V", optional: true, advanced: true },
  ],
  compute(v) {
    const kw = v.num("kw");
    const pf1 = v.num("pf1");
    const pf2 = v.num("pf2");
    const volts = v.num("volts");
    const capVolts = v.num("capVolts");
    const pfBad = (p: number | undefined) => Number.isNaN(p) || (isNum(p) && (p <= 0 || p > 1));
    const bad = invalid([
      ["kw", Number.isNaN(kw) || kw === 0],
      ["pf1", pfBad(pf1)],
      ["pf2", !isNum(pf2) || pfBad(pf2)],
      ["volts", Number.isNaN(volts) || volts === 0],
      ["capVolts", Number.isNaN(capVolts) || capVolts === 0],
    ]);
    if (bad.length) return { error: "Enter numbers; power factors are between 0 and 1.", fields: bad };
    if (kw === undefined || pf1 === undefined) return undefined;
    if (pf2! <= pf1) return { error: "The target power factor must be higher than the present one.", fields: ["pf2"] };

    const kvar = pfCorrectionKvar(kw, pf1, pf2!);
    const kva1 = kw / pf1;
    const kva2 = kw / pf2!;
    const rows: Row[] = [
      { label: "Capacitor needed", ...amount(kvar, 1, " kvar") },
      { group: "Before → after", label: "Apparent power", detail: t("{pct}% less", { pct: fmt(((kva1 - kva2) / kva1) * 100, 1) }), value: `${fmt(kva1, 1)} → ${fmt(kva2, 1)} kVA`, status: "good" },
    ];
    if (volts !== undefined && capVolts !== undefined) {
      rows.push({ label: "Capacitor to buy", detail: t("{rated} V rating on {volts} V", { rated: fmt(capVolts, 1), volts: fmt(volts, 1) }), ...amount(capacitorRatedKvar(kvar, volts, capVolts), 1, " kvar") });
    }
    if (volts !== undefined) {
      const phase = readPhase(v);
      const a1 = kvaToAmps(kva1, volts, phase);
      const a2 = kvaToAmps(kva2, volts, phase);
      rows.push({ group: "Before → after", label: "Line current", detail: t("at {volts} V {phase}", { volts: fmt(volts, 1), phase: phaseName(phase) }), value: `${fmt(a1, 1)} → ${fmt(a2, 1)} A`, status: "good" });
    }
    return {
      heading: t("{kw} kW from PF {from} to {to}", { kw: fmt(kw, 2), from: fmt(pf1, 3), to: fmt(pf2!, 3) }),
      rows,
      formula: ["kvar = kW × (tan φ₁ − tan φ₂), where φ = arccos(power factor).", "kVA = kW ÷ power factor.", "A capacitor's kvar follows the square of the voltage: on 480 V, a 600 V unit gives 64% of its rating."],
    };
  },
};
