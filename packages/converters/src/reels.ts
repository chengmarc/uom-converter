import { reelsForPulls } from "@uom/core/pricing";
import { amount, fmt } from "./format";
import { byRegion, type Converter, type RegionExamples, type Values } from "./model";
import { packs as packsVisual } from "./visual";
import { invalid } from "./checks";
import { t } from "@uom/i18n";

const REEL_SUGGESTIONS = { ft: ["100", "250", "500", "1000", "2500", "5000"], m: ["75", "150", "300", "500", "1000"] };
const reelUnit = (v: Values) => v.str("unit") as "ft" | "m";

export const reels: Converter = {
  id: "reels",
  topic: "Pricing & ordering",
  title: "Wire coils & reels",
  blurb: "Coils or reels needed to cover a run. Three wires pulled 200 ft is 600 ft of wire.",
  empty: "Enter the run length and the coil or reel length.",
  note: "A pull can't be spliced, so each run has to come whole from one coil or reel. Conductors pulled at the same time, and different colours, each need their own coil or reel.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "3 wires × 200 ft, 500 ft spools", set: { unit: "ft", run: "200", count: "3", size: "500" } },
      { label: "4 wires × 450 ft, 2,500 ft reels", set: { unit: "ft", run: "450", count: "4", size: "2500" } },
    ],
    ca: [
      { label: "3 wires × 60 m, 75 m coils", set: { unit: "m", run: "60", count: "3", size: "75" } },
      { label: "4 wires × 140 m, 500 m reels", set: { unit: "m", run: "140", count: "4", size: "500" } },
    ],
    eu: [
      { label: "3 wires × 60 m, 100 m rings", set: { unit: "m", run: "60", count: "3", size: "100" } },
      { label: "5 cores × 140 m, 500 m drums", set: { unit: "m", run: "140", count: "5", size: "500" } },
    ],
  })),
  fields: [
    { kind: "number", id: "run", label: "Run length", suffix: reelUnit, placeholder: "200" },
    { kind: "number", id: "count", label: "Conductors in the run", value: "1" },
    { kind: "number", id: "size", label: "Coil or reel length", suffix: reelUnit, placeholder: "500", list: (v) => REEL_SUGGESTIONS[reelUnit(v)] },
    { kind: "number", id: "extra", label: "Extra per conductor, for terminations", suffix: reelUnit, value: "0", advanced: true },
    {
      kind: "choice",
      id: "unit",
      label: "Measured in",
      advanced: true,
      options: [
        { value: "ft", label: "Feet" },
        { value: "m", label: "Metres" },
      ],
      value: (v) => (v.region === "us" ? "ft" : "m"),
    },
  ],
  compute(v) {
    const unit = reelUnit(v);
    const run = v.num("run");
    const count = v.num("count") ?? 1;
    const size = v.num("size");
    const extra = v.num("extra") ?? 0;
    const bad = invalid([
      ["run", Number.isNaN(run) || run === 0],
      ["count", Number.isNaN(count) || count < 1 || !Number.isInteger(count)],
      ["size", Number.isNaN(size) || size === 0],
      ["extra", Number.isNaN(extra)],
    ]);
    if (bad.length) return { error: "Enter numbers; conductors is a whole number, run and reel lengths more than 0.", fields: bad };
    if (run === undefined || size === undefined) return undefined;
    const o = reelsForPulls(run + extra, count, size);
    if (!o) return { error: t("One pull is {pull} {unit}, longer than a {size} {unit} coil or reel, and it can't be spliced. Use a longer reel.", { pull: fmt(run + extra, 2), size: fmt(size, 2), unit }), fields: ["run", "size"] };
    return {
      heading: t("{count} × {run} {unit} run, {size} {unit} coils or reels", { count: fmt(count, 0), run: fmt(run, 2), size: fmt(size, 2), unit }),
      rows: [
        { label: "Coils / reels to order", value: fmt(o.units, 0) },
        { label: "Whole pulls per coil or reel", value: fmt(o.perReel, 0) },
        { label: "Total wire", ...amount(o.total, 2, ` ${unit}`) },
        { label: "Left over", detail: "offcuts, and what's left on the last coil or reel", ...amount(o.over, 2, ` ${unit}`) },
      ],
      visual: packsVisual({ count: o.units, lastUsed: o.lastUsed, shape: "reel", label: t("{n} × {size} {unit} · {left} {unit} left over", { n: fmt(o.units, 0), size: fmt(size, 2), left: fmt(o.over, 2), unit }) }),
      formula: ["One pull = run length + extra for terminations.", "Whole pulls per coil or reel = its length ÷ one pull, rounded down.", "Coils or reels = conductors ÷ whole pulls per coil or reel, rounded up."],
    };
  },
};
