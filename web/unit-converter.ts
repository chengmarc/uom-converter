// The simple converter shape: a value and a unit on the left, every other unit on the right.

import type { Region } from "../src/region";
import { fmt, plain, typed } from "./format";
import { dyn, type Converter, type Dyn, type Topic, type Values } from "./ui";

export interface Unit {
  key: string;
  /** Full name for result rows, e.g. "Metres". */
  name: string;
  /** Symbol shown next to numbers, e.g. "m". */
  symbol: string;
  toBase: (n: number) => number;
  fromBase: (n: number) => number;
  digits: number;
}

/** A unit where `perBase` of it make one base unit. */
export const linear = (key: string, name: string, symbol: string, perBase: number, digits = 4): Unit => ({
  key,
  name,
  symbol,
  toBase: (n) => n / perBase,
  fromBase: (n) => n * perBase,
  digits,
});

/** Value + unit picker on the left, every other unit on the right. */
export function unitConverter(opts: {
  id: string;
  topic: Topic;
  title: string;
  blurb: Dyn<string>;
  units: Unit[];
  /** Unit selected at first, per region; defaults to the first unit. */
  defaultUnit?: Partial<Record<Region, string>>;
  /** [value, unit key] pairs; labels are generated. */
  examples: Dyn<[number, string][]>;
  signed?: boolean;
  note?: Dyn<string>;
  format?: (n: number, u: Unit) => string;
  /** Definitions behind the conversion, e.g. "1 ft = 0.3048 m exactly". */
  formula?: string[];
  /** The unit people expect as the answer for each input unit (mm → in, ft → m); shown first. */
  counterpart?: Record<string, string>;
  visual?: (value: number, from: Unit, v: Values) => Element | undefined;
}): Converter {
  const format = opts.format ?? ((n, u) => `${fmt(n, u.digits)} ${u.symbol}`);
  const unit = (key: string) => opts.units.find((u) => u.key === key)!;
  return {
    id: opts.id,
    topic: opts.topic,
    title: opts.title,
    blurb: opts.blurb,
    note: opts.note,
    empty: "Enter a value to convert.",
    examples: (v) => dyn(opts.examples, v).map(([n, key]) => ({ label: format(n, unit(key)), set: { value: typed(n), unit: key } })),
    fields: [
      { kind: "number", id: "value", label: "Value", placeholder: "0", signed: opts.signed },
      {
        kind: "choice",
        id: "unit",
        label: "Unit",
        options: opts.units.map((u) => ({ value: u.key, label: u.symbol })),
        value: (v) => opts.defaultUnit?.[v.region] ?? opts.units[0].key,
      },
    ],
    compute(v) {
      const n = v.num("value");
      if (n === undefined) return undefined;
      if (Number.isNaN(n)) return { error: "Enter a number.", fields: ["value"] };
      const from = unit(v.str("unit"));
      const base = from.toBase(n);
      return {
        heading: `${format(n, from)} equals`,
        rows: opts.units
          .filter((u) => u !== from)
          .sort((a, b) => Number(b.key === opts.counterpart?.[from.key]) - Number(a.key === opts.counterpart?.[from.key]))
          .map((u) => {
            const out = u.fromBase(base);
            return { label: u.name, value: format(out, u), copy: plain(out, u.digits) };
          }),
        formula: opts.formula,
        visual: opts.visual?.(n, from, v),
      };
    },
  };
}
