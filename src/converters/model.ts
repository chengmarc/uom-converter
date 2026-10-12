// What a converter is, apart from how any one app shows it: inputs ("from"), a compute function
// that returns labelled result rows ("to"), worked examples, and optional diagrams and reference
// tables described as data. Each app (src/web for the website and the Windows app) renders these
// its own way; nothing here touches the page.

import type { Region } from "../core/region";
import type { Visual } from "./visual";

export type Dyn<T> = T | ((v: Values) => T);

/** Reads a converter's inputs; each app supplies its own, backed by its own form. */
export interface Values {
  readonly region: Region;
  /** A field's text as typed (trimmed), or a choice's selected value. */
  str(id: string): string;
  /** A field parsed as a number: undefined when empty, NaN when not a number. */
  num(id: string): number | undefined;
}

interface FieldBase {
  id: string;
  /** Tucked under "More options": settings most people leave at their default. */
  advanced?: boolean;
}

export type Field =
  | (FieldBase & {
      kind: "number" | "text";
      label: Dyn<string>;
      /** Show the region's currency symbol (before or after, as the region writes it). */
      currency?: boolean;
      suffix?: Dyn<string>;
      placeholder?: Dyn<string>;
      value?: Dyn<string>;
      list?: Dyn<string[]>;
      signed?: boolean;
      optional?: boolean;
    })
  | (FieldBase & { kind: "choice"; label: string; options: { value: string; label: string }[]; value?: Dyn<string> });

export type Status = "good" | "warn" | "bad";

export interface Row {
  label: string;
  /** Small print under the label. */
  detail?: string;
  /** Rows sharing a group are shown under that subheading. */
  group?: string;
  value: string;
  copy?: string;
  status?: Status;
}

export type Output =
  | {
      heading: string;
      /** The first row is the answer and is shown large; the rest are details. */
      rows: Row[];
      /** How the numbers were worked out, kept out of the way under "How it's calculated". */
      formula?: string[];
      /** A small diagram shown under the answer. */
      visual?: Visual;
      /** The reference table row (TableRow.key) this answer matches. */
      highlight?: string;
    }
  | { error: string; fields: string[] }
  /** Not enough input yet. */
  | undefined;

/** One click fills the form with a worked example. Keys are field ids; values as typed. */
export interface Example {
  label: string;
  set: Record<string, string>;
}

/**
 * Examples that differ by region; regions left out use the US ones. Built when a converter
 * renders, so numbers in labels use that region's format.
 */
export type RegionExamples = Partial<Record<Region, Example[]>> & { us: Example[] };
export const byRegion =
  (ex: () => RegionExamples) =>
  (v: Values): Example[] => {
    const all = ex();
    return all[v.region] ?? all.us;
  };

/** A reference table shown under the converter, folded away until opened. */
export interface Table {
  summary: string;
  columns: string[];
  /** A group row starts a section; key matches Output.highlight. */
  rows: ({ group: string } | { cells: string[]; key?: string })[];
  /** Many or long columns: let the table take the full width. */
  wide?: boolean;
}

/** The sidebar sections. Each has an icon in icons.ts. */
export type Topic = "Pricing" | "Wire & conduit" | "Electrical" | "Units" | "Product data";

export interface Converter {
  id: string;
  topic: Topic;
  title: string;
  blurb: Dyn<string>;
  fields: Field[];
  compute: (v: Values) => Output;
  examples: Dyn<Example[]>;
  /** Shown in the results box before anything is entered. */
  empty: string;
  note?: Dyn<string>;
  /** Built when the converter renders, so numbers use the region's format. */
  table?: () => Table;
}

export const dyn = <T>(d: Dyn<T>, v: Values) => (typeof d === "function" ? (d as (v: Values) => T)(v) : d);
