import { MM_PER_IN, parseInches, toFraction } from "../../core/units";
import { fmt, parseNumber, plain, typed } from "../format";
import type { Converter, Example, Status } from "../ui";
import { ruler } from "../visuals";

export const fraction: Converter = {
  id: "fraction",
  topic: "Units",
  title: "Fractions of an inch",
  blurb: "Fractional inches ↔ decimal inches ↔ millimetres, for drill bits, punches and enclosure sizes.",
  empty: "Enter a size like 1-23/32, 0.885 or 22.5 mm.",
  examples: (): Example[] => [
    { label: '1-23/32"', set: { value: "1-23/32", unit: "in" } },
    { label: `${fmt(0.885, 3)}"`, set: { value: typed(0.885), unit: "in" } },
    { label: `${fmt(22.5, 1)} mm`, set: { value: typed(22.5), unit: "mm" } },
  ],
  fields: [
    { kind: "text", id: "value", label: "Size", placeholder: `1-23/32 or ${typed(0.885)}` },
    {
      kind: "choice",
      id: "unit",
      label: "Unit",
      options: [
        { value: "in", label: "Inches" },
        { value: "mm", label: "Millimetres" },
      ],
    },
  ],
  compute(v) {
    const raw = v.str("value");
    if (raw === "") return undefined;
    const fromMm = v.str("unit") === "mm";
    const decimal = raw.includes("/") ? undefined : parseNumber(raw.replace(/\s*(mm|in|")$/i, ""));
    const n = fromMm ? decimal : raw.includes("/") ? parseInches(raw) : decimal;
    if (n === undefined || Number.isNaN(n)) {
      return { error: fromMm ? "Enter millimetres, like 22.5." : "Enter inches, like 1-23/32, 7/8 or 0.885.", fields: ["value"] };
    }
    const inches = fromMm ? n / MM_PER_IN : n;
    const exact = (f: { error: number }) => Math.abs(f.error) < 5e-7;
    const off = (f: { error: number }) =>
      exact(f) ? "exact" : `${fmt(Math.abs(f.error), 4)}" (${fmt(Math.abs(f.error) * MM_PER_IN, 2)} mm) ${f.error > 0 ? "over" : "under"}`;
    const f16 = toFraction(inches, 16);
    const f64 = toFraction(inches, 64);
    return {
      heading: `${fromMm ? `${fmt(n, 3)} mm` : `${raw.replace(/["″]$/, "")}"`} equals`,
      rows: [
        ...(fromMm
          ? [{ label: "Nearest 1/64\"", detail: off(f64), value: f64.label, status: (exact(f64) ? "good" : undefined) as Status | undefined }]
          : [{ label: "Millimetres", value: `${fmt(inches * MM_PER_IN, 2)} mm`, copy: plain(inches * MM_PER_IN, 2) }]),
        { label: "Decimal inches", value: `${fmt(inches, 4)}"`, copy: plain(inches, 4) },
        ...(fromMm ? [] : [{ label: "Nearest 1/64\"", detail: off(f64), value: f64.label, status: (exact(f64) ? "good" : undefined) as Status | undefined }]),
        { label: "Nearest 1/16\" (tape measure)", detail: off(f16), value: f16.label, status: exact(f16) ? "good" : undefined },
      ],
      visual: ruler(inches, [
        { at: inches, label: `${fmt(inches, 3)}"`, kind: "exact" },
        ...(exact(f16) ? [] : [{ at: f16.value, label: f16.label, kind: "near" as const }]),
      ]),
      formula: ["1 inch = 25.4 mm exactly.", "Nearest fraction: round to the nearest 1/16 or 1/64, then reduce (32/64 → 1/2)."],
    };
  },
};
