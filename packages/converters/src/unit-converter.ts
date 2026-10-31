// The simple converter shape: a value and a unit on the left, every other unit on the right.

import type { Region } from "@uom/core/region";
import { feetInchesLabel, parseFeetInches } from "@uom/core/units";
import { fmt, plain, typed } from "./format";
import { dyn, type Converter, type Dyn, type Table, type Topic, type Values } from "./model";
import type { Visual } from "./visual";
import { t } from "@uom/i18n";

interface Unit {
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
  visual?: (value: number, from: Unit, v: Values) => Visual | undefined;
  /** Values people often look up, by unit key: shown as a reference table in every unit. */
  common?: Record<string, number[]>;
  /** The key of the feet unit, to also take and show lengths the way plans write them: 12'-6". */
  feetInches?: string;
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
      opts.feetInches
        ? { kind: "text", id: "value", label: "Value", placeholder: `0 or 12'-6"` }
        : { kind: "number", id: "value", label: "Value", placeholder: "0", signed: opts.signed },
      {
        kind: "choice",
        id: "unit",
        label: "Unit",
        columns: opts.units.length > 5 ? 3 : undefined,
        options: opts.units.map((u) => ({ value: u.key, label: u.symbol })),
        value: (v) => opts.defaultUnit?.[v.region] ?? opts.units[0].key,
      },
    ],
    compute(v) {
      // A foot or inch mark says what the unit is, whichever one is selected.
      const marked = opts.feetInches ? parseFeetInches(v.str("value")) : undefined;
      const n = marked ?? v.num("value");
      if (n === undefined) return undefined;
      if (Number.isNaN(n)) return { error: "Enter a number.", fields: ["value"] };
      const from = unit(marked === undefined ? v.str("unit") : opts.feetInches!);
      const base = from.toBase(n);
      const feet = opts.feetInches && marked === undefined ? unit(opts.feetInches).fromBase(base) : undefined;
      return {
        heading: t("{value} equals", { value: marked === undefined ? format(n, from) : v.str("value") }),
        rows: [
          ...opts.units
            .filter((u) => u !== from || marked !== undefined)
            .sort((a, b) => Number(b.key === opts.counterpart?.[from.key]) - Number(a.key === opts.counterpart?.[from.key]))
            .map((u) => {
              const out = u.fromBase(base);
              return { label: u.name, value: format(out, u), copy: plain(out, u.digits) };
            }),
          ...(feet === undefined ? [] : [{ label: "Feet and inches", detail: 'to the nearest 1/16"', value: feetInchesLabel(feet) }]),
        ],
        formula: opts.formula,
        visual: opts.visual?.(n, from, v),
        highlight: key(from, n),
      };
    },
    table: opts.common && (() => commonTable(opts.title, opts.units, opts.common!, format)),
  };
}

const key = (u: Unit, n: number) => `${u.key}:${n}`;

/** Each unit's common values in every unit, grouped under the unit they start from. */
function commonTable(title: string, units: Unit[], common: Record<string, number[]>, format: (n: number, u: Unit) => string): Table {
  return {
    summary: `Common ${title.toLowerCase()} conversions`,
    columns: units.map((u) => u.name),
    rows: units.flatMap((from) =>
      common[from.key]
        ? [
            { group: from.name },
            ...common[from.key].map((n) => ({ key: key(from, n), cells: units.map((u) => format(u.fromBase(from.toBase(n)), u)) })),
          ]
        : [],
    ),
    wide: units.length > 3,
  };
}
