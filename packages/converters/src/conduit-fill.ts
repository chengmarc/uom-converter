import { conduitFill, EMT_SIZES, FILL_WIRE_SIZES, type WireType } from "@uom/core/conduitfill";
import { conductorInfo } from "@uom/core/conductors";
import { MM_PER_IN } from "@uom/core/units";
import { amount, fmt, plain } from "./format";
import type { Converter, Example, Row, Status } from "./model";
import { gauge } from "./visual";
import { t } from "@uom/i18n";

const LINES = [1, 2, 3];

export const conduitFillConverter: Converter = {
  id: "conduit-fill",
  topic: "Wire & conduit",
  title: "Conduit fill",
  blurb: "The smallest EMT for a mix of wires, or how full a size would be.",
  empty: "Enter a wire size and how many.",
  note: (v) =>
    v.region === "ca"
      ? "EMT only, up to 500 kcmil. Areas are from NEC Chapter 9 Table 5; check CEC Tables 6 and 8 in Canada, where the areas for RW90 can differ from these."
      : v.region === "eu"
        ? "North American EMT and wire. European conduit is sized by outside diameter, to different rules."
        : "EMT only, up to 500 kcmil. Count every conductor, grounds included. Fill is a limit, not a target: a long pull with bends needs room to spare.",
  examples: (): Example[] => [
    { label: "3 × 12, 4 × 10, 8 × 8 AWG THHN", set: { s1: "12", n1: "3", s2: "10", n2: "4", s3: "8", n3: "8" } },
    { label: "4 × 4/0 AWG in 2\" EMT", set: { s1: "4/0", n1: "4", conduit: "2" } },
    { label: "4 × 500 kcmil XHHW", set: { s1: "500 kcmil", n1: "4", type: "xhhw" } },
  ],
  fields: [
    ...LINES.flatMap((i) => [
      { kind: "text" as const, id: `s${i}`, label: () => t("Wire size {n}", { n: i }), placeholder: "12", list: FILL_WIRE_SIZES, optional: i > 1 },
      { kind: "number" as const, id: `n${i}`, label: () => t("How many of size {n}", { n: i }), optional: i > 1 },
    ]),
    {
      kind: "choice",
      id: "conduit",
      label: "Check this EMT size",
      columns: 3,
      options: [{ value: "", label: "Find the smallest" }, ...EMT_SIZES.map((c) => ({ value: c.inch, label: `${c.inch}" (${c.metric})` }))],
    },
    {
      kind: "choice",
      id: "type",
      label: "Insulation",
      options: [
        { value: "thhn", label: "THHN / THWN-2" },
        { value: "xhhw", label: "XHHW / USE-2" },
      ],
    },
    {
      kind: "choice",
      id: "nipple",
      label: "Run length",
      advanced: true,
      options: [
        { value: "no", label: "Over 24 in" },
        { value: "yes", label: "Nipple, 24 in or less" },
      ],
    },
  ],
  compute(v) {
    const lines: { size: string; count: number }[] = [];
    const bad: string[] = [];
    for (const i of LINES) {
      const raw = v.str(`s${i}`);
      const count = v.num(`n${i}`);
      if (Number.isNaN(count) || (count !== undefined && (count < 1 || !Number.isInteger(count)))) bad.push(`n${i}`);
      if (raw === "") continue;
      const c = conductorInfo(raw);
      if ("error" in c) return { error: t("{error}.", { error: c.error }), fields: [`s${i}`] };
      if (!FILL_WIRE_SIZES.includes(c.label)) return { error: t("No area listed for {size}: this covers 14 AWG to 500 kcmil.", { size: c.label }), fields: [`s${i}`] };
      if (count !== undefined) lines.push({ size: c.label, count });
    }
    if (bad.length) return { error: "Enter whole numbers of conductors.", fields: bad };
    if (!lines.length) return undefined;

    const conduit = v.str("conduit") || undefined;
    const f = conduitFill(lines, v.str("type") as WireType, v.str("nipple") === "yes", conduit);
    const mm2 = f.area * MM_PER_IN ** 2;
    const limitPct = fmt(f.limit * 100, 0);
    const status: Status | undefined = f.chosen === undefined ? undefined : f.chosen.fits ? "good" : "bad";
    const smallest: Row = {
      label: "Smallest EMT",
      detail: t("at the {pct}% fill limit", { pct: limitPct }),
      value: f.smallest ? `${f.smallest.inch}" (${f.smallest.metric})` : t('Over 4"'),
      copy: f.smallest?.inch ?? "",
      status: f.smallest ? undefined : "warn",
    };
    const rows: Row[] = [
      ...(f.chosen ? [{ label: f.chosen.fits ? "Fits this EMT" : "Over the fill limit", detail: t("limit {pct}%", { pct: limitPct }), value: `${fmt(f.chosen.percent, 1)}%`, copy: plain(f.chosen.percent, 1), status }] : []),
      smallest,
      { label: "Conductor area", detail: `${fmt(mm2, 1)} mm²`, ...amount(f.area, 4, " in²") },
      { label: "Conductors", value: fmt(f.conductors, 0) },
    ];
    return {
      heading: lines.map((l) => `${fmt(l.count, 0)} × ${l.size}`).join(" + "),
      rows,
      visual: f.chosen ? gauge({ value: f.chosen.percent, unit: "%", status: status!, marks: [{ at: f.limit * 100, label: `${limitPct}%` }] }) : undefined,
      formula: [
        "Fill limit: one conductor 53%, two 31%, three or more 40%, a nipple of 24 in or less 60%.",
        "Conductor areas from NEC Chapter 9 Table 5, EMT areas from Table 4.",
      ],
    };
  },
};
