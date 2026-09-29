import { conductorInfo, NA_BUILDING_SIZES, type Metal } from "../../src/conductors";
import { fmt, plain } from "../format";
import type { Converter } from "../ui";
import { crossSections } from "../visuals";
import { metalField, weightRows, WIRE_FORMULA } from "./shared";

export const awg: Converter = {
  id: "awg",
  topic: "Wire & conduit",
  title: "AWG / kcmil → mm²",
  blurb: "North American wire size to metric area and the matching IEC 60228 size.",
  empty: "Enter a wire size, like 12, 1/0 or 250 kcmil.",
  examples: () => ["12 AWG", "4/0 AWG", "250 kcmil"].map((s) => ({ label: s, set: { size: s } })),
  fields: [
    {
      kind: "text",
      id: "size",
      label: "Wire size",
      placeholder: "12, 1/0, 250 kcmil",
      list: NA_BUILDING_SIZES.map((s) => (s.includes("kcmil") ? s : `${s} AWG`)),
    },
    metalField,
  ],
  compute(v) {
    const raw = v.str("size");
    if (raw === "") return undefined;
    const c = conductorInfo(raw);
    if ("error" in c) return { error: c.error + ".", fields: ["size"] };
    const next = c.nextLargerMetricMm2;
    return {
      heading: `${c.label} equals`,
      rows: [
        { label: "Cross-section", value: `${fmt(c.areaMm2, 3)} mm²`, copy: plain(c.areaMm2, 3) },
        { group: "Metric wire size (IEC)", label: "Nearest size", value: `${fmt(c.nearestMetricMm2, 2)} mm²`, copy: plain(c.nearestMetricMm2, 2) },
        {
          group: "Metric wire size (IEC)",
          label: "Smallest size at least as big",
          value: next === undefined ? "None, over 1000 mm²" : `${fmt(next, 2)} mm²`,
          copy: next === undefined ? "" : plain(next, 2),
          status: next === undefined ? "warn" : undefined,
        },
        { group: "Area", label: "Thousand circular mils", value: `${fmt(c.areaKcmil, 2)} kcmil`, copy: plain(c.areaKcmil, 2) },
        ...(c.solidDiameterMm === undefined
          ? []
          : [{ group: "Area", label: "Diameter, solid conductor", detail: "stranded is larger", value: `${fmt(c.solidDiameterMm, 3)} mm`, copy: plain(c.solidDiameterMm, 3) }]),
        ...weightRows(c.areaMm2, v.str("metal") as Metal),
      ],
      visual: crossSections([
        { label: c.label, sub: `${fmt(c.areaMm2, 2)} mm²`, areaMm2: c.areaMm2, kind: "input" },
        { label: `${fmt(c.nearestMetricMm2, 2)} mm²`, sub: "nearest", areaMm2: c.nearestMetricMm2, kind: "match" },
        ...(next !== undefined && next !== c.nearestMetricMm2 ? [{ label: `${fmt(next, 2)} mm²`, sub: "next larger", areaMm2: next, kind: "other" as const }] : []),
      ]),
      formula: WIRE_FORMULA,
    };
  },
};
