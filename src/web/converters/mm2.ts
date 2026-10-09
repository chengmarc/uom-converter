import { METRIC_SIZES_MM2, metricToNorthAmerican, mm2ToKcmil } from "../../core/conductors";
import { amount, fmt, typed } from "../format";
import type { Converter } from "../ui";
import { crossSections } from "../visuals";
import { metalField, readMetal, weightRows, WIRE_FORMULA } from "./wire";

export const mm2: Converter = {
  id: "mm2",
  topic: "Wire & conduit",
  title: "mm² → AWG / kcmil",
  blurb: "Metric wire area to the matching North American building-wire size.",
  empty: "Enter an area in mm², like 2.5 or 120.",
  examples: () => [2.5, 35, 120].map((n) => ({ label: `${fmt(n, 2)} mm²`, set: { area: typed(n) } })),
  fields: [
    { kind: "number", id: "area", label: "Wire area", suffix: "mm²", placeholder: typed(2.5), list: METRIC_SIZES_MM2.map((m) => typed(m)) },
    metalField,
  ],
  compute(v) {
    const a = v.num("area");
    if (a === undefined) return undefined;
    if (Number.isNaN(a) || a === 0) return { error: "Enter an area in mm², like 2.5 or 120.", fields: ["area"] };
    const na = metricToNorthAmerican(a);
    const kcmil = mm2ToKcmil(a);
    const next = na.nextLarger;
    return {
      heading: `${fmt(a, 3)} mm² equals`,
      rows: [
        { label: "Nearest AWG / kcmil size", value: na.nearest.label },
        { label: "Smallest size at least as big", value: na.nextLarger?.label ?? "None, over 1000 kcmil", copy: na.nextLarger?.label ?? "", status: na.nextLarger ? undefined : "warn" },
        { label: "Thousand circular mils", ...amount(kcmil, 2, " kcmil") },
        ...weightRows(a, readMetal(v)),
      ],
      visual: crossSections([
        { label: `${fmt(a, 2)} mm²`, sub: "entered", areaMm2: a, kind: "input" },
        { label: na.nearest.label, sub: `nearest · ${fmt(na.nearest.areaMm2, 2)} mm²`, areaMm2: na.nearest.areaMm2, kind: "match" },
        ...(next && next !== na.nearest ? [{ label: next.label, sub: `next larger · ${fmt(next.areaMm2, 2)} mm²`, areaMm2: next.areaMm2, kind: "other" as const }] : []),
      ]),
      formula: WIRE_FORMULA,
    };
  },
};
