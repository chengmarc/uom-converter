// The diagrams a result can carry, as data. Each platform draws them its own way
// (packages/ui/src/visuals.ts draws inline SVG). The constructors keep converter code reading like a call to a diagram.

/** How an answer reads against its limits; a gauge and a result row show it the same way. */
export type Status = "good" | "warn" | "bad";

export interface Section {
  label: string;
  sub: string;
  areaMm2: number;
  kind: "input" | "match" | "other";
}

export type Visual =
  /** A bar filled to `value`, with limit marks (e.g. 3% and 5% voltage drop). */
  | { kind: "gauge"; value: number; unit: string; marks: { at: number; label: string }[]; status: Status }
  /** Conductor cross-sections with area to scale, so "nearest" and "next larger" can be compared. */
  | { kind: "cross-sections"; items: Section[] }
  /** One inch of ruler around the value, with the value and nearest fractions marked. */
  | { kind: "ruler"; inches: number; marks: { at: number; label: string; kind: "exact" | "near" }[] }
  /** One shape per pack, the last filled only as far as it's used (`lastUsed` is 0–1). */
  | { kind: "packs"; count: number; lastUsed: number; shape: "box" | "reel"; label: string }
  /** A −40 to 120 °C scale with the usual conductor ratings marked. */
  | { kind: "temperature"; celsius: number }
  /** Two prices on a log axis; a 10×/100×/1000× gap shows as whole decades. */
  | { kind: "price-gap"; a: number; b: number; factor: number | undefined };

type Opts<K extends Visual["kind"]> = Omit<Extract<Visual, { kind: K }>, "kind">;

export const gauge = (o: Opts<"gauge">): Visual => ({ kind: "gauge", ...o });
export const crossSections = (items: Section[]): Visual => ({ kind: "cross-sections", items });
export const ruler = (inches: number, marks: Opts<"ruler">["marks"]): Visual => ({ kind: "ruler", inches, marks });
export const packs = (o: Opts<"packs">): Visual => ({ kind: "packs", ...o });
export const temperatureScale = (celsius: number): Visual => ({ kind: "temperature", celsius });
export const priceGap = (a: number, b: number, factor: number | undefined): Visual => ({ kind: "price-gap", a, b, factor });
