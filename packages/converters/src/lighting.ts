import { LUX_PER_FC } from "@uom/core/units";
import { amount, fmt, typed } from "./format";
import { byRegion, type Converter, type RegionExamples, type Values } from "./model";
import { invalid, isNum } from "./checks";
import { t } from "@uom/i18n";

const metric = (v: Values) => v.str("units") === "metric";

export const lighting: Converter = {
  id: "lighting",
  topic: "Lighting, EV & solar",
  title: "Lighting layout",
  blurb: "How many fixtures a room needs for a target light level, by the lumen method.",
  empty: "Enter the room area, the target level and the lumens per fixture.",
  note: "An estimate for an even layout. Coefficient of utilization depends on the room and the fixture: get it from the maker's photometric data. Light loss factor allows for dirt and lamp aging.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "2,000 ft² office, 50 fc, 5,000 lm", set: { area: "2000", level: "50", lumens: "5000", watts: "40", units: "imperial" } },
      { label: "10,000 ft² warehouse, 30 fc, 24,000 lm", set: { area: "10000", level: "30", lumens: "24000", units: "imperial" } },
    ],
    eu: [
      { label: "200 m² office, 500 lx, 5.000 lm", set: { area: "200", level: "500", lumens: "5000", watts: "40", units: "metric" } },
      { label: "1.000 m² warehouse, 300 lx, 24.000 lm", set: { area: "1000", level: "300", lumens: "24000", units: "metric" } },
    ],
  })),
  fields: [
    { kind: "number", id: "area", label: "Room area", suffix: (v) => (metric(v) ? "m²" : "ft²"), placeholder: (v) => (metric(v) ? "200" : "2000") },
    { kind: "number", id: "level", label: "Target light level", suffix: (v) => (metric(v) ? "lx" : "fc"), placeholder: (v) => (metric(v) ? "500" : "50") },
    { kind: "number", id: "lumens", label: "Lumens per fixture", suffix: "lm", placeholder: "5000" },
    { kind: "number", id: "watts", label: "Watts per fixture", suffix: "W", optional: true },
    { kind: "number", id: "cu", label: "Coefficient of utilization", value: () => typed(0.6), advanced: true },
    { kind: "number", id: "llf", label: "Light loss factor", value: () => typed(0.8), advanced: true },
    {
      kind: "choice",
      id: "units",
      label: "Units",
      advanced: true,
      value: (v) => (v.region === "eu" ? "metric" : "imperial"),
      options: [
        { value: "imperial", label: "ft² and foot-candles" },
        { value: "metric", label: "m² and lux" },
      ],
    },
  ],
  compute(v) {
    const area = v.num("area");
    const level = v.num("level");
    const lumens = v.num("lumens");
    const watts = v.num("watts");
    const cu = v.num("cu");
    const llf = v.num("llf");
    const positive = (n: number | undefined) => Number.isNaN(n) || n === 0;
    const factor = (n: number | undefined) => !isNum(n) || n <= 0 || n > 1;
    const bad = invalid([
      ["area", positive(area)],
      ["level", positive(level)],
      ["lumens", positive(lumens)],
      ["watts", positive(watts)],
      ["cu", factor(cu)],
      ["llf", factor(llf)],
    ]);
    if (bad.length) return { error: "Enter numbers above 0; the two factors are between 0 and 1.", fields: bad };
    if (area === undefined || level === undefined || lumens === undefined) return undefined;
    const usable = lumens * cu! * llf!;
    const exact = (level * area) / usable;
    const count = Math.ceil(exact - 1e-9);
    const reached = (count * usable) / area;
    const m = metric(v);
    const u = m ? "lx" : "fc";
    const a = m ? "m²" : "ft²";
    return {
      heading: t("{area} {a} at {level} {u}", { area: fmt(area, 1), a, level: fmt(level, 1), u }),
      rows: [
        { label: "Fixtures needed", detail: t("{exact} before rounding up", { exact: fmt(exact, 2) }), value: fmt(count, 0) },
        { label: "Level with that many", ...amount(reached, 1, ` ${u}`) },
        { label: m ? "In foot-candles" : "In lux", ...amount(m ? reached / LUX_PER_FC : reached * LUX_PER_FC, 1, m ? " fc" : " lx") },
        ...(watts === undefined ? [] : [{ label: "Lighting power", detail: t("{density} W/{a}", { density: fmt((count * watts) / area, 2), a }), ...amount(count * watts, 0, " W") }]),
      ],
      formula: ["Fixtures = level × area ÷ (lumens × coefficient of utilization × light loss factor), rounded up."],
    };
  },
};
