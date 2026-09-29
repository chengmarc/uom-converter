import { lineToLine, lineToNeutral, wyeSystem } from "../../core/electrical";
import { regionInfo } from "../regions";
import { fmt, plain } from "../format";
import { byRegion, type Converter, type RegionExamples } from "../ui";

export const volts: Converter = {
  id: "volts",
  topic: "Electrical",
  title: "Line ↔ neutral voltage",
  blurb: "Three-phase wye systems: line-to-neutral = line-to-line ÷ √3.",
  empty: "Enter a voltage, like 208 or 347.",
  note: "Only for wye (star) systems. 120/240 V single-phase and delta systems don't follow the √3 rule.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "208 V line-to-line", set: { v: "208", from: "ll" } },
      { label: "480 V line-to-line", set: { v: "480", from: "ll" } },
      { label: "277 V line-to-neutral", set: { v: "277", from: "ln" } },
    ],
    ca: [
      { label: "600 V line-to-line", set: { v: "600", from: "ll" } },
      { label: "208 V line-to-line", set: { v: "208", from: "ll" } },
      { label: "347 V line-to-neutral", set: { v: "347", from: "ln" } },
    ],
    eu: [
      { label: "400 V line-to-line", set: { v: "400", from: "ll" } },
      { label: "690 V line-to-line", set: { v: "690", from: "ll" } },
      { label: "230 V line-to-neutral", set: { v: "230", from: "ln" } },
    ],
  })),
  fields: [
    { kind: "number", id: "v", label: "Voltage", suffix: "V", placeholder: (v) => regionInfo(v.region).loadVolts, list: (v) => regionInfo(v.region).volts },
    {
      kind: "choice",
      id: "from",
      label: "Measured",
      options: [
        { value: "ll", label: "Line-to-line" },
        { value: "ln", label: "Line-to-neutral" },
      ],
    },
  ],
  compute(v) {
    const n = v.num("v");
    if (n === undefined) return undefined;
    if (Number.isNaN(n) || n === 0) return { error: "Enter a voltage greater than 0.", fields: ["v"] };
    const fromLL = v.str("from") === "ll";
    const out = fromLL ? lineToNeutral(n) : lineToLine(n);
    const system = wyeSystem(n, v.region);
    return {
      heading: `${fmt(n, 2)} V ${fromLL ? "line-to-line" : "line-to-neutral"} equals`,
      rows: [
        { label: fromLL ? "Line-to-neutral" : "Line-to-line", value: `${fmt(out, 1)} V`, copy: plain(out, 1) },
        ...(system ? [{ label: "Standard system", value: `${system[0]}/${system[1]} V`, copy: `${system[0]}/${system[1]}` }] : []),
      ],
      formula: ["Line-to-neutral = line-to-line ÷ √3 (√3 ≈ 1.732)."],
    };
  },
};
