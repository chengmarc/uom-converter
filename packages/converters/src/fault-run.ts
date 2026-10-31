import { conductorInfo, faultAtEndOfRun, NA_BUILDING_SIZES, type Raceway } from "@uom/core/conductors";
import { ftToM } from "@uom/core/units";
import { regionInfo } from "./regions";
import { amount, fmt, plain } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row, type Status, type Values } from "./model";
import { invalid, isNum } from "./checks";
import { phaseField, readPhase, voltsField } from "./electrical-fields";
import { metalField, readMetal } from "./wire";
import { t } from "@uom/i18n";

const lengthUnit = (v: Values) => v.str("lenUnit") as "ft" | "m";

export const faultRun: Converter = {
  id: "fault-run",
  topic: "Equipment",
  title: "Fault current down a run",
  blurb: "How much fault current is left at the end of a feeder, checked against the equipment's interrupting rating.",
  empty: "Enter the fault current at the start, the wire and the length.",
  note: "An estimate by the point-to-point method, from the worst-case figure at the start of the run. Motors near the far end add to it. Not a substitute for a short-circuit study.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "23.2 kA, 500 kcmil, 100 ft at 480 V, 22 kAIC panel", set: { start: "23.2", size: "500 kcmil", len: "100", volts: "480", phase: "3", rating: "22", lenUnit: "ft", metal: "Cu" } },
      { label: "10 kA, 4 AWG, 50 ft at 208 V", set: { start: "10", size: "4", len: "50", volts: "208", phase: "3", lenUnit: "ft", metal: "Cu" } },
    ],
    ca: [
      { label: "25 kA, 500 kcmil, 30 m at 600 V, 22 kAIC panel", set: { start: "25", size: "500 kcmil", len: "30", volts: "600", phase: "3", rating: "22", lenUnit: "m", metal: "Cu" } },
      { label: "10 kA, 4 AWG, 15 m at 208 V", set: { start: "10", size: "4", len: "15", volts: "208", phase: "3", lenUnit: "m", metal: "Cu" } },
    ],
  })),
  fields: [
    { kind: "number", id: "start", label: "Fault current at the start", suffix: "kA", placeholder: "23.2" },
    { kind: "text", id: "size", label: "Wire size", placeholder: "500 kcmil", list: NA_BUILDING_SIZES.map((s) => s.label) },
    { kind: "number", id: "len", label: "One-way length of the run", suffix: lengthUnit, placeholder: "100" },
    voltsField("Line-to-line voltage"),
    { kind: "number", id: "rating", label: "Equipment interrupting rating", suffix: "kA", placeholder: "22", optional: true },
    phaseField("3", true),
    { ...metalField, label: "Conductor metal" },
    { kind: "number", id: "sets", label: "Parallel sets", value: "1", advanced: true },
    {
      kind: "choice",
      id: "raceway",
      label: "Run in",
      advanced: true,
      options: [
        { value: "nonmetallic", label: "PVC conduit or cable" },
        { value: "steel", label: "Steel conduit" },
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
  ],
  compute(v) {
    const start = v.num("start");
    const raw = v.str("size");
    const len = v.num("len");
    const volts = v.num("volts");
    const rating = v.num("rating");
    const sets = v.num("sets");
    const bad = invalid([
      ["start", Number.isNaN(start) || start === 0],
      ["len", Number.isNaN(len) || len === 0],
      ["volts", !isNum(volts) || volts === 0],
      ["rating", Number.isNaN(rating) || rating === 0],
      ["sets", !isNum(sets) || sets < 1 || !Number.isInteger(sets)],
    ]);
    if (bad.length) return { error: "Enter numbers above 0; parallel sets is a whole number.", fields: bad };
    if (start === undefined || raw === "" || len === undefined) return undefined;
    const c = conductorInfo(raw);
    if ("error" in c) return { error: t("{error}.", { error: c.error }), fields: ["size"] };
    const unit = lengthUnit(v);
    const r = faultAtEndOfRun({
      areaMm2: c.areaMm2,
      metal: readMetal(v),
      system: "na",
      raceway: v.str("raceway") as Raceway,
      hz: regionInfo(v.region).hz,
      lengthM: unit === "ft" ? ftToM(len) : len,
      faultAmps: start * 1000,
      volts: volts!,
      phase: readPhase(v),
      sets: sets!,
    });
    const kA = r.faultAmps / 1000;
    const safe = rating === undefined ? undefined : kA <= rating;
    const status: Status | undefined = safe === undefined ? undefined : safe ? "good" : "bad";
    const rows: Row[] = [
      { label: "Fault current at the end", detail: `${fmt(r.faultAmps, 0)} A`, value: `${fmt(kA, 1)} kA`, copy: plain(kA, 2), status },
      ...(rating === undefined ? [] : [{ label: safe ? "Within the equipment's rating" : "Over the equipment's rating", detail: t("{kA} kA rating", { kA: fmt(rating, 1) }), ...amount(Math.abs(rating - kA), 1, " kA"), status }]),
      { label: "Reduction along the run", detail: t("{from} kA at the start", { from: fmt(start, 1) }), ...amount((1 - r.multiplier) * 100, 1, "%") },
      { label: "Multiplier M", value: fmt(r.multiplier, 3) },
    ];
    return {
      heading: t("{size}, {len} {unit} from {from} kA", { size: c.label, len: fmt(len, 2), unit, from: fmt(start, 1) }),
      rows,
      formula: [
        "f = k × length × fault current × Z ÷ (parallel sets × volts), with k = √3 three-phase and 2 single-phase.",
        "M = 1 ÷ (1 + f). Fault current at the end = fault current at the start × M.",
        "Z = √(R² + X²) for the conductor at 20 °C, since a cold conductor lets the most through.",
      ],
    };
  },
};
