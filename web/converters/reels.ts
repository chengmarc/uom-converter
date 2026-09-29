import { unitsToOrder } from "../../src/reference";
import { fmt, plain, type Converter, type Values } from "../ui";
import { packs as packsVisual } from "../visuals";
import { invalid, byRegion, type RegionExamples } from "./shared";

const REEL_SUGGESTIONS = { ft: ["100", "250", "500", "1000", "2500", "5000"], m: ["75", "150", "300", "500", "1000"] };
const reelUnit = (v: Values) => v.str("unit") as "ft" | "m";

export const reels: Converter = {
  id: "reels",
  group: "Pricing",
  title: "Wire coils & reels",
  blurb: "Coils or reels needed to cover a run. Three wires pulled 200 ft is 600 ft of wire.",
  empty: "Enter the run length and the coil or reel length.",
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
    const bad = invalid([
      ["run", Number.isNaN(run)],
      ["count", Number.isNaN(count) || count < 1 || !Number.isInteger(count)],
      ["size", Number.isNaN(size) || size === 0],
    ]);
    if (bad.length) return { error: "Enter numbers; conductors is a whole number, reel length more than 0.", fields: bad };
    if (run === undefined || size === undefined) return undefined;
    const total = run * count;
    const o = unitsToOrder(total, size);
    return {
      heading: `${fmt(count, 0)} × ${fmt(run, 2)} ${unit} run, ${fmt(size, 2)} ${unit} coils or reels`,
      rows: [
        { label: "Coils / reels to order", value: fmt(o.units, 0) },
        { label: "Total wire", value: `${fmt(total, 2)} ${unit}`, copy: plain(total, 2) },
        { label: "Left over", detail: "on the last coil or reel", value: `${fmt(o.over, 2)} ${unit}`, copy: plain(o.over, 2) },
      ],
      visual:
        o.units > 0
          ? packsVisual({ count: o.units, lastUsed: 1 - o.over / size, shape: "reel", label: `${fmt(o.units, 0)} × ${fmt(size, 2)} ${unit} · ${fmt(o.over, 2)} ${unit} left over` })
          : undefined,
      formula: ["Total wire = run length × conductors.", "Coils or reels = total ÷ coil length, rounded up."],
    };
  },
};
