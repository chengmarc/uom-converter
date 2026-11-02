import type { WiringCode } from "@uom/core/ampacity";
import { BOX_WIRE_SIZES, boxFill, CONDUCTOR_ALLOWANCE } from "@uom/core/boxfill";
import { CM3_PER_IN3 } from "@uom/core/units";
import { fmt, plain } from "./format";
import { codeField, readCode } from "./electrical-fields";
import { byRegion, type Converter, type RegionExamples, type Row, type Status, type Values } from "./model";
import { gauge } from "./visual";
import { invalid } from "./checks";
import { t } from "@uom/i18n";

const boxUnit = (v: Values) => v.str("unit") as "in3" | "ml";
const conductorField = (size: string) => `c${size}`;

/** A volume in the code's own unit, as both in³ and mL. */
const toMl = (code: WiringCode, n: number) => (code === "nec" ? n * CM3_PER_IN3 : n);
const toIn3 = (code: WiringCode, n: number) => (code === "nec" ? n : n / CM3_PER_IN3);
const inBoth = (code: WiringCode, n: number) => ({
  value: code === "nec" ? `${fmt(n, 2)} in³` : `${fmt(n, 1)} mL`,
  detail: code === "nec" ? `${fmt(toMl(code, n), 1)} mL` : `${fmt(toIn3(code, n), 2)} in³`,
  copy: plain(n, 2),
});

const COUNTS = ["devices", "studs", "grounds", "connectors"];

export const boxFillConverter: Converter = {
  id: "box-fill",
  topic: "Wire & conduit",
  title: "Box fill",
  blurb: "The box volume your wires and devices need, counted the NEC or the CEC way.",
  empty: "Enter how many conductors of each size are in the box.",
  note: (v) =>
    v.region === "eu"
      ? "IEC 60364 has no box fill calculation: use the box maker's rating. The NEC and CEC methods here are for North American work."
      : "Count each insulated conductor entering or leaving the box once. Pigtails don't count. The NEC and CEC allow different space per conductor, so a result under one doesn't carry over to the other.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "18 in³ box: 4 × 14 AWG, one receptacle", set: { code: "nec", unit: "in3", box: "18", c14: "4", devices: "1", grounds: "2" } },
      { label: "18 in³ box: 6 × 12 AWG, two switches", set: { code: "nec", unit: "in3", box: "18", c12: "6", devices: "2", grounds: "3", clamps: "yes" } },
    ],
    ca: [
      { label: "295 mL box: 4 × 14 AWG, one receptacle", set: { code: "cec", unit: "ml", box: "295", c14: "4", devices: "1", connectors: "2" } },
      { label: "295 mL box: 6 × 12 AWG, two switches", set: { code: "cec", unit: "ml", box: "295", c12: "6", devices: "2", connectors: "4" } },
    ],
  })),
  fields: [
    codeField(),
    { kind: "number", id: "box", label: "Box volume", suffix: (v) => (boxUnit(v) === "in3" ? "in³" : "mL"), placeholder: (v) => (boxUnit(v) === "in3" ? "18" : "295"), optional: true },
    ...BOX_WIRE_SIZES.map((size) => ({ kind: "number" as const, id: conductorField(size), label: () => t("{size} AWG conductors", { size }), placeholder: "0", optional: true })),
    { kind: "number", id: "devices", label: "Switches and receptacles", placeholder: "0", optional: true },
    { kind: "number", id: "studs", label: "Fixture studs or hickeys", placeholder: "0", optional: true },
    { kind: "number", id: "grounds", label: "Grounding conductors (NEC only)", placeholder: "0", optional: true },
    { kind: "number", id: "connectors", label: "Wire connectors (CEC only)", placeholder: "0", optional: true },
    {
      kind: "choice",
      id: "clamps",
      label: "Internal cable clamps (NEC only)",
      options: [
        { value: "no", label: "No" },
        { value: "yes", label: "Yes" },
      ],
    },
    {
      kind: "choice",
      id: "unit",
      label: "Box volume in",
      advanced: true,
      value: (v) => (v.region === "us" ? "in3" : "ml"),
      options: [
        { value: "in3", label: "in³" },
        { value: "ml", label: "mL" },
      ],
    },
  ],
  compute(v) {
    const code = readCode(v);
    const box = v.num("box");
    const count = (id: string) => v.num(id) ?? 0;
    const whole = (id: string) => Number.isNaN(v.num(id)) || !Number.isInteger(count(id));
    const bad = invalid([
      ["box", Number.isNaN(box) || box === 0],
      ...[...BOX_WIRE_SIZES.map(conductorField), ...COUNTS].map((id): [string, boolean] => [id, whole(id)]),
    ]);
    if (bad.length) return { error: "Enter whole numbers for what's in the box, and a box volume above 0.", fields: bad };

    const fill = boxFill(code, {
      conductors: Object.fromEntries(BOX_WIRE_SIZES.map((s) => [s, count(conductorField(s))])),
      devices: count("devices"),
      studs: count("studs"),
      clamps: v.str("clamps") === "yes",
      grounds: count("grounds"),
      connectors: count("connectors"),
    });
    if (!fill) return undefined;

    const g = t("What takes up the space");
    const parts: Row[] = [
      ...fill.wires.map((w) => ({ group: g, label: t("{n} × {size} AWG", { n: fmt(w.count, 0), size: w.size }), ...inBoth(code, w.volume) })),
      ...(fill.others.devices ? [{ group: g, label: "Switches and receptacles", ...inBoth(code, fill.others.devices) }] : []),
      ...(fill.others.studs ? [{ group: g, label: "Fixture studs or hickeys", ...inBoth(code, fill.others.studs) }] : []),
      ...(fill.others.clamps ? [{ group: g, label: "Internal cable clamps", ...inBoth(code, fill.others.clamps) }] : []),
      ...(fill.others.grounds ? [{ group: g, label: "Grounding conductors", ...inBoth(code, fill.others.grounds) }] : []),
      ...(fill.others.connectors ? [{ group: g, label: "Wire connectors", ...inBoth(code, fill.others.connectors) }] : []),
    ];
    const formula = [
      code === "nec" ? t("Conductors from NEC Table 314.16(B): 14 AWG 2.00 in³, 12 AWG 2.25, 10 AWG 2.50, 8 AWG 3.00, 6 AWG 5.00.") : t("Conductors from CEC Table 22: 14 AWG 24.6 mL, 12 AWG 28.7, 10 AWG 36.9, 8 AWG 45.1, 6 AWG 73.7."),
      t("Each switch or receptacle counts as two of the largest conductor, each stud or hickey as one."),
      code === "nec"
        ? t("NEC: all internal clamps count as one. The first four grounding conductors count as one, and each after that as a quarter. Wire connectors don't count.")
        : t("CEC: every two wire connectors count as one conductor. Bare grounding conductors don't count; insulated ones go in with the conductors. A device deeper than 2.54 cm needs more space, worked out from its depth."),
    ];
    const needed = inBoth(code, fill.total);
    const heading = code === "nec" ? t("Box fill by the NEC") : t("Box fill by the CEC");
    if (box === undefined) return { heading, rows: [{ label: "Minimum box volume", ...needed }, ...parts], formula };

    // Compared in the code's own unit, so a value from its tables is never rounded twice.
    const boxInCode = boxUnit(v) === "ml" ? (code === "cec" ? box : box / CM3_PER_IN3) : code === "nec" ? box : box * CM3_PER_IN3;
    const percent = (fill.total / boxInCode) * 100;
    const fits = fill.total <= boxInCode + 1e-9;
    const status: Status = fits ? "good" : "bad";
    return {
      heading,
      rows: [
        { label: fits ? "Fits the box" : "Too full", detail: t("{used} of {box}", { used: needed.value, box: inBoth(code, boxInCode).value }), value: `${fmt(percent, 1)}%`, copy: plain(percent, 1), status },
        { label: "Minimum box volume", ...needed },
        { label: "Box volume", ...inBoth(code, boxInCode) },
        { label: fits ? "Spare" : "Short by", ...inBoth(code, Math.abs(boxInCode - fill.total)) },
        ...parts,
      ],
      visual: gauge({ value: percent, unit: "%", status, marks: [{ at: 100, label: t("Full") }] }),
      formula,
    };
  },
  table: () => ({
    summary: "Space per conductor",
    columns: ["Wire size", "NEC 314.16(B)", "CEC Table 22"],
    rows: BOX_WIRE_SIZES.map((s) => ({
      cells: [`${s} AWG`, `${fmt(CONDUCTOR_ALLOWANCE.nec[s], 2, 2)} in³`, `${fmt(CONDUCTOR_ALLOWANCE.cec[s], 1, 1)} mL`],
    })),
  }),
};
