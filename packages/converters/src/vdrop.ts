import { buildingSizesFor, conductorImpedance, conductorInfo, METRIC_SIZES_MM2, metricSizesFor, NA_WIRE_SIZES, type Raceway, smallestSizeForDrop, voltageDrop } from "@uom/core/conductors";
import type { Region } from "@uom/core/region";
import { ftToM } from "@uom/core/units";
import { regionInfo } from "./regions";
import { amount, fmt, parseNumber, typed } from "./format";
import { byRegion, type Converter, type RegionExamples, type Status, type Values } from "./model";
import { gauge } from "./visual";
import { isNum, invalid } from "./checks";
import { phaseField, phaseName, readPhase, voltsField } from "./electrical-fields";
import { metalField, readMetal } from "./wire";
import { t } from "@uom/i18n";

const vdropNote = (region: Region) =>
  region === "us"
    ? t("NEC informational notes suggest at most 3% for a branch circuit or feeder and 5% overall.")
    : region === "ca"
      ? t("CEC Rule 8-102 limits a feeder or branch circuit to 3% and the total to 5%, from the supply side of the service to the load. It works from the connected load, or 80% of the overcurrent device if that isn't known.")
      : t("IEC 60364-5-52 (Annex G) recommends at most 3% for lighting and 5% for other uses when fed from the public low-voltage network; national rules may differ.");

const sizeSystem = (v: Values) => v.str("sys") as "na" | "mm2";
const lengthUnit = (v: Values) => v.str("lenUnit") as "ft" | "m";

/** The most a single circuit should drop: a limit in Canada, a suggestion elsewhere. */
const dropLimit = (region: Region, target: number) => (region === "ca" ? 3 : Math.max(5, target));

export const vdrop: Converter = {
  id: "vdrop",
  topic: "Electrical",
  title: "Voltage drop",
  blurb: "Voltage drop on a run, and the smallest wire that keeps it within your target.",
  empty: "Enter the wire size, run length and load current.",
  note: (v) => vdropNote(v.region),
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "12 AWG, 100 ft, 16 A at 120 V", set: { size: "12", len: "100", amps: "16", volts: "120", phase: "1", sys: "na", lenUnit: "ft", metal: "Cu" } },
      { label: "4/0 Al feeder, 250 ft, 150 A at 208 V 3-phase", set: { size: "4/0", len: "250", amps: "150", volts: "208", phase: "3", sys: "na", lenUnit: "ft", metal: "Al" } },
      { label: "10 AWG, 150 ft, 20 A at 277 V", set: { size: "10", len: "150", amps: "20", volts: "277", phase: "1", sys: "na", lenUnit: "ft", metal: "Cu" } },
    ],
    ca: [
      { label: "12 AWG, 30 m, 12 A at 120 V", set: { size: "12", len: "30", amps: "12", volts: "120", phase: "1", sys: "na", lenUnit: "m", metal: "Cu" } },
      { label: "3/0 Cu, 60 m, 150 A at 600 V 3-phase", set: { size: "3/0", len: "60", amps: "150", volts: "600", phase: "3", sys: "na", lenUnit: "m", metal: "Cu" } },
    ],
    eu: [
      { label: "2,5 mm², 30 m, 16 A at 230 V", set: { size: "2,5", len: "30", amps: "16", volts: "230", phase: "1", sys: "mm2", lenUnit: "m", metal: "Cu" } },
      { label: "35 mm², 80 m, 100 A at 400 V 3-phase", set: { size: "35", len: "80", amps: "100", volts: "400", phase: "3", sys: "mm2", lenUnit: "m", metal: "Cu" } },
    ],
  })),
  fields: [
    {
      kind: "text",
      id: "size",
      label: (v) => (sizeSystem(v) === "mm2" ? "Wire size (mm²)" : "Wire size (AWG / kcmil)"),
      placeholder: (v) => (sizeSystem(v) === "mm2" ? typed(2.5) : "12, 1/0, 250 kcmil"),
      list: (v) => (sizeSystem(v) === "mm2" ? METRIC_SIZES_MM2.map((m) => typed(m)) : NA_WIRE_SIZES.map((s) => s.label)),
    },
    { kind: "number", id: "len", label: "One-way length of the run", suffix: lengthUnit, placeholder: "100" },
    { kind: "number", id: "amps", label: (v) => (v.region === "ca" ? "Load current (connected load, or 80% of the breaker)" : "Load current"), suffix: "A", placeholder: "16" },
    voltsField("Supply voltage", "branchVolts"),
    phaseField("1"),
    {
      kind: "choice",
      id: "sys",
      label: "Wire sizes in",
      advanced: true,
      value: (v) => (v.region === "eu" ? "mm2" : "na"),
      options: [
        { value: "na", label: "AWG / kcmil" },
        { value: "mm2", label: "mm²" },
      ],
    },
    {
      kind: "choice",
      id: "lenUnit",
      label: "Length in",
      advanced: true,
      value: (v) => (v.region === "us" ? "ft" : "m"),
      options: [
        { value: "ft", label: "Feet" },
        { value: "m", label: "Metres" },
      ],
    },
    { ...metalField, label: "Conductor metal" },
    {
      kind: "choice",
      id: "raceway",
      label: "Run in",
      advanced: true,
      value: (v) => (v.region === "eu" ? "nonmetallic" : "steel"),
      options: [
        { value: "steel", label: "Steel conduit" },
        { value: "nonmetallic", label: "PVC conduit or cable" },
      ],
    },
    { kind: "number", id: "pf", label: "Load power factor (blank for the worst case)", placeholder: () => typed(0.85), optional: true, advanced: true },
    { kind: "number", id: "sets", label: "Parallel sets", value: "1", advanced: true },
    { kind: "number", id: "target", label: "Target drop", suffix: "%", value: "3", advanced: true },
  ],
  compute(v) {
    const sys = sizeSystem(v);
    const raw = v.str("size");
    const len = v.num("len");
    const amps = v.num("amps");
    const volts = v.num("volts");
    const target = v.num("target");
    const pf = v.num("pf");
    const sets = v.num("sets");
    const bad = invalid([
      ["len", Number.isNaN(len) || len === 0],
      ["amps", Number.isNaN(amps) || amps === 0],
      ["volts", !isNum(volts) || volts === 0],
      ["target", !isNum(target) || target <= 0 || target >= 100],
      ["pf", Number.isNaN(pf) || (isNum(pf) && (pf <= 0 || pf > 1))],
      ["sets", !isNum(sets) || sets < 1 || !Number.isInteger(sets)],
    ]);
    if (bad.length) return { error: "Enter numbers above 0; the target is a percentage, power factor at most 1, parallel sets a whole number.", fields: bad };
    if (raw === "" || len === undefined || amps === undefined) return undefined;

    let areaMm2: number;
    let label: string;
    if (sys === "na") {
      const c = conductorInfo(raw);
      if ("error" in c) return { error: t("{error}.", { error: c.error }), fields: ["size"] };
      areaMm2 = c.areaMm2;
      label = c.label;
    } else {
      const n = parseNumber(raw.replace(/\s*mm(2|²)?$/i, ""));
      if (!isNum(n) || n === 0) return { error: "Enter an area in mm², like 2.5 or 16.", fields: ["size"] };
      areaMm2 = n;
      label = `${fmt(n, 3)} mm²`;
    }

    const metal = readMetal(v);
    const unit = lengthUnit(v);
    const lengthM = unit === "ft" ? ftToM(len) : len;
    const phase = readPhase(v);
    const setup = { metal, system: sys === "na" ? ("na" as const) : ("iec" as const), raceway: v.str("raceway") as Raceway, hz: regionInfo(v.region).hz };
    const run = { ...setup, pf, sets: sets!, lengthM, amps, volts: volts!, phase };
    const d = voltageDrop({ ...run, areaMm2 });
    const { r, x } = conductorImpedance({ ...setup, areaMm2 });
    const fit =
      sys === "na"
        ? smallestSizeForDrop(buildingSizesFor(metal), (s) => s.areaMm2, target!, run)
        : smallestSizeForDrop(metricSizesFor(metal), (m) => m, target!, run);
    const fitLabel =
      fit === undefined
        ? sys === "na" ? t("Over 2000 kcmil") : t("Over 1000 mm²")
        : typeof fit === "number" ? `${fmt(fit, 2)} mm²` : fit.label;
    const limit = dropLimit(v.region, target!);
    const status: Status = d.percent <= Math.min(target!, limit) ? "good" : d.percent <= limit ? "warn" : "bad";
    const pct = fmt(target!, 2);
    const verdict = status === "good" ? t("within your {pct}% target", { pct }) : status === "warn" ? t("over your {pct}% target", { pct }) : t("over {pct}%", { pct: fmt(limit, 2) });
    const h = { size: sets === 1 ? label : t("{sets} × {size}", { sets: fmt(sets!, 0), size: label }), len: fmt(len, 2), unit, amps: fmt(amps, 2), volts: fmt(volts!, 1), phase: phaseName(phase) };
    const perKft = (n: number) => fmt(n * 0.3048, 4);

    return {
      heading: metal === "Cu" ? t("{size} copper, {len} {unit}, {amps} A at {volts} V {phase}", h) : t("{size} aluminum, {len} {unit}, {amps} A at {volts} V {phase}", h),
      rows: [
        { label: "Voltage drop", detail: verdict, ...amount(d.percent, 2, "%"), status },
        { label: "Drop in volts", ...amount(d.volts, 2, " V") },
        { label: "Voltage at the load", ...amount(d.atLoad, 1, " V") },
        {
          label: "Smallest size for voltage drop only",
          detail: fit === undefined ? "add parallel sets, or shorten the run" : t("not an ampacity check: confirm it's rated for {amps} A", { amps: fmt(amps, 2) }),
          value: fitLabel,
          status: "warn",
        },
      ],
      visual: gauge({
        value: d.percent,
        unit: "%",
        status,
        marks: [
          { at: target!, label: t("{pct}% target", { pct }) },
          ...(limit !== target ? [{ at: limit, label: `${fmt(limit, 2)}%` }] : []),
        ],
      }),
      formula: [
        phase === 3 ? "Three-phase: drop = √3 × amps × Z × one-way length ÷ parallel sets." : "Single-phase: drop = 2 × amps × Z × one-way length ÷ parallel sets.",
        pf === undefined ? "Z = √(R² + X²), the most any power factor could give." : "Z = R × PF + X × sin φ, where φ = arccos(PF).",
        unit === "ft" ? t("R = {r}, X = {x} Ω per 1,000 ft, AC at 75 °C.", { r: perKft(r), x: perKft(x) }) : t("R = {r}, X = {x} Ω/km, AC at 75 °C.", { r: fmt(r, 4), x: fmt(x, 4) }),
        sys === "na"
          ? "R and X from NEC Chapter 9 Tables 8 and 9: stranded, three conductors in one conduit. Past 500 kcmil, reactance sets a floor that a bigger wire can't get under."
          : "R from the IEC 60228 class 2 limit at 20 °C, corrected to 75 °C. X from NEC Chapter 9 Table 9 at the same area, scaled to the frequency.",
      ],
    };
  },
};
