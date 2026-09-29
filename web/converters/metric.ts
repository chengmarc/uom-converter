import { toMetric } from "../../src/uom";
import { fmt, plain, type Converter } from "../ui";

export const metricSpec: Converter = {
  id: "metric",
  group: "Product data",
  title: "Spec value → metric (ETIM)",
  blurb: "ETIM features take metric values. Type a spec as the supplier wrote it, with its unit, and get the metric value and unit code.",
  empty: "Enter a value with its unit: 12 AWG, 3/4 in, 75 ft, 167 °F, 35 lb-in.",
  note: "Check which unit the ETIM feature expects (mm vs m, g vs kg) before loading.",
  examples: () => ["12 AWG", '3/4"', "75 ft", "35 lb-in", "167 °F"].map((s) => ({ label: s, set: { spec: s } })),
  fields: [{ kind: "text", id: "spec", label: "Value with unit", placeholder: "12 AWG, 3/4 in, 75 ft" }],
  compute(v) {
    const raw = v.str("spec");
    if (raw === "") return undefined;
    const r = toMetric(raw);
    if ("error" in r) return { error: r.error + ".", fields: ["spec"] };
    return {
      heading: `${r.readAs} equals`,
      rows: [
        { label: "Metric value", value: `${fmt(r.value, 4)} ${r.unit}`, copy: plain(r.value, 4) },
        { label: "Unit", value: r.unit },
        { label: "UN/ECE code", value: r.code },
      ],
      formula: ["Wire sizes become cross-section in mm² from the AWG definition.", "Exact factors: 1 in = 25.4 mm, 1 ft = 0.3048 m, 1 lb = 0.45359237 kg, 1 lbf·in = 0.113 N·m."],
    };
  },
};
