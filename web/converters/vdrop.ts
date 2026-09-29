import { conductorInfo, conductorOhmsPerKm, METRIC_SIZES_MM2, NA_BUILDING_SIZES, smallestSizeForDrop, voltageDrop, type Metal } from "../../src/conductors";
import type { Phase } from "../../src/electrical";
import type { Region } from "../../src/region";
import { ftToM } from "../../src/units";
import { fmt, parseNumber, plain, typed } from "../format";
import { byRegion, type Converter, type RegionExamples, type Status, type Values } from "../ui";
import { gauge } from "../visuals";
import { isNum, invalid } from "./checks";
import { phaseName, phaseField, voltsField } from "./electrical-fields";
import { info, metalField } from "./wire";

const VDROP_NOTE: Record<Region, string> = {
  us: "An estimate from DC resistance that ignores reactance, so it reads a little low for large conductors. NEC informational notes suggest at most 3% for a branch circuit or feeder and 5% overall.",
  ca: "An estimate from DC resistance that ignores reactance, so it reads a little low for large conductors. CEC Rule 8-102 allows 3% in a feeder or branch circuit and 5% overall, from the supply side of the service to the load.",
  eu: "An estimate from DC resistance that ignores reactance, so it reads a little low for large conductors. IEC 60364-5-52 (Annex G) recommends at most 3% for lighting and 5% for other uses when fed from the public low-voltage network; national rules may differ.",
};

const sizeSystem = (v: Values) => v.str("sys") as "na" | "mm2";
const lengthUnit = (v: Values) => v.str("lenUnit") as "ft" | "m";

export const vdrop: Converter = {
  id: "vdrop",
  topic: "Electrical",
  title: "Voltage drop",
  blurb: "Voltage drop on a run, and the smallest wire that keeps it within your target.",
  empty: "Enter the wire size, run length and load current.",
  note: (v) => VDROP_NOTE[v.region],
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
      list: (v) => (sizeSystem(v) === "mm2" ? METRIC_SIZES_MM2.map((m) => typed(m)) : NA_BUILDING_SIZES.map((s) => (s.includes("kcmil") ? s : `${s} AWG`))),
    },
    { kind: "number", id: "len", label: "One-way length of the run", suffix: lengthUnit, placeholder: "100" },
    { kind: "number", id: "amps", label: "Load current", suffix: "A", placeholder: "16" },
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
    { kind: "number", id: "target", label: "Target drop", suffix: "%", value: "3", advanced: true },
  ],
  compute(v) {
    const sys = sizeSystem(v);
    const raw = v.str("size");
    const len = v.num("len");
    const amps = v.num("amps");
    const volts = v.num("volts");
    const target = v.num("target");
    const bad = invalid([
      ["len", Number.isNaN(len) || len === 0],
      ["amps", Number.isNaN(amps) || amps === 0],
      ["volts", !isNum(volts) || volts === 0],
      ["target", !isNum(target) || target <= 0 || target >= 100],
    ]);
    if (bad.length) return { error: "Enter numbers above 0; the target is a percentage.", fields: bad };
    if (raw === "" || len === undefined || amps === undefined) return undefined;

    let areaMm2: number;
    let label: string;
    if (sys === "na") {
      const c = conductorInfo(raw);
      if ("error" in c) return { error: c.error + ".", fields: ["size"] };
      areaMm2 = c.areaMm2;
      label = c.label;
    } else {
      const n = parseNumber(raw.replace(/\s*mm(2|²)?$/i, ""));
      if (!isNum(n) || n === 0) return { error: "Enter an area in mm², like 2.5 or 16.", fields: ["size"] };
      areaMm2 = n;
      label = `${fmt(n, 3)} mm²`;
    }

    const metal = v.str("metal") as Metal;
    const unit = lengthUnit(v);
    const lengthM = unit === "ft" ? ftToM(len) : len;
    const phase = Number(v.str("phase")) as Phase;
    const run = { metal, lengthM, amps, volts: volts!, phase };
    const d = voltageDrop({ ...run, areaMm2 });
    const ohmsKm = conductorOhmsPerKm(areaMm2, metal);
    const fit =
      sys === "na"
        ? smallestSizeForDrop(NA_BUILDING_SIZES, (s) => info(s).areaMm2, target!, run)
        : smallestSizeForDrop(METRIC_SIZES_MM2, (m) => m, target!, run);
    const fitLabel =
      fit === undefined
        ? sys === "na" ? "Over 1000 kcmil" : "Over 1000 mm²"
        : typeof fit === "number" ? `${fmt(fit, 2)} mm²` : info(fit).label;
    const limit = Math.max(5, target!);
    const status: Status = d.percent <= target! ? "good" : d.percent <= limit ? "warn" : "bad";
    const verdict = status === "good" ? `within your ${fmt(target!, 2)}% target` : status === "warn" ? `over your ${fmt(target!, 2)}% target` : `over ${fmt(limit, 2)}%`;

    return {
      heading: `${label} ${metal === "Cu" ? "copper" : "aluminum"}, ${fmt(len, 2)} ${unit}, ${fmt(amps, 2)} A at ${fmt(volts!, 1)} V ${phaseName(phase)}`,
      rows: [
        { label: "Voltage drop", detail: verdict, value: `${fmt(d.percent, 2)}%`, copy: plain(d.percent, 2), status },
        { label: "Drop in volts", value: `${fmt(d.volts, 2)} V`, copy: plain(d.volts, 2) },
        { label: "Voltage at the load", value: `${fmt(d.atLoad, 1)} V`, copy: plain(d.atLoad, 1) },
        {
          label: "Smallest size for your target",
          detail: `keeps the drop at or under ${fmt(target!, 2)}%`,
          value: fitLabel,
          status: fit === undefined ? "warn" : undefined,
        },
      ],
      visual: gauge({
        value: d.percent,
        unit: "%",
        status,
        marks: [
          { at: target!, label: `${fmt(target!, 2)}% target` },
          ...(limit !== target ? [{ at: limit, label: `${fmt(limit, 2)}%` }] : []),
        ],
      }),
      formula: [
        phase === 3 ? "Three-phase: drop = √3 × amps × resistance per metre × one-way length." : "Single-phase: drop = 2 × amps × resistance per metre × one-way length.",
        `Resistance: ${unit === "ft" ? `${fmt(ohmsKm * 0.3048, 4)} Ω per 1,000 ft` : `${fmt(ohmsKm, 4)} Ω/km`} for this conductor, DC at 75 °C.`,
        "From resistivity: copper 1/58 Ω·mm²/m, aluminum 0.028264 Ω·mm²/m at 20 °C, rising 0.393% (Cu) or 0.403% (Al) per °C.",
        "Checked against NEC Chapter 9 Table 8: 12 AWG solid copper = 1.93 Ω per 1,000 ft.",
      ],
    };
  },
};
