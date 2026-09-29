// Small inline-SVG diagrams for results. Colours come from CSS classes (see style.css), so they
// follow light and dark mode. Each returns a <svg> with a text alternative.

import { fmt } from "./format";
import type { Status } from "./ui";

const NS = "http://www.w3.org/2000/svg";

type Attrs = Record<string, string | number>;

function s(tag: string, attrs: Attrs = {}, ...children: (Element | string)[]): Element {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  for (const c of children) e.append(c);
  return e;
}

function svg(width: number, height: number, label: string, ...children: Element[]): Element {
  const root = s("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": label, class: "viz" });
  root.append(s("title", {}, label), ...children);
  return root;
}

const text = (x: number, y: number, t: string, cls = "viz-text", anchor = "middle") =>
  s("text", { x, y, class: cls, "text-anchor": anchor }, t);

// ---------- Gauge: a value against limits ----------

/** A bar filled to `value`, with limit marks (e.g. 3% and 5% voltage drop). */
export function gauge(opts: { value: number; unit: string; marks: { at: number; label: string }[]; status: Status }): Element {
  const W = 320;
  const x0 = 10;
  const x1 = W - 10;
  const max = Math.max(opts.value * 1.15, ...opts.marks.map((m) => m.at * 1.4));
  const x = (v: number) => x0 + (Math.min(v, max) / max) * (x1 - x0);
  const parts: Element[] = [
    s("rect", { x: x0, y: 22, width: x1 - x0, height: 12, rx: 6, class: "viz-track" }),
    s("rect", { x: x0, y: 22, width: Math.max(4, x(opts.value) - x0), height: 12, rx: 6, class: `viz-fill is-${opts.status}` }),
    text(Math.min(Math.max(x(opts.value), 30), W - 30), 15, `${fmt(opts.value, 2)}${opts.unit}`, "viz-text strong"),
  ];
  for (const m of opts.marks) {
    parts.push(s("line", { x1: x(m.at), x2: x(m.at), y1: 18, y2: 38, class: "viz-mark" }), text(x(m.at), 52, m.label));
  }
  return svg(W, 58, `${fmt(opts.value, 2)}${opts.unit} against ${opts.marks.map((m) => m.label).join(" and ")}`, ...parts);
}

// ---------- Conductor cross-sections to scale ----------

export interface Section {
  label: string;
  sub: string;
  areaMm2: number;
  kind: "input" | "match" | "other";
}

/** Circles with area to scale, so "nearest" and "next larger" can be seen side by side. */
export function crossSections(items: Section[]): Element {
  const maxD = 64;
  const maxArea = Math.max(...items.map((i) => i.areaMm2));
  const colW = 100;
  const W = colW * items.length;
  const parts: Element[] = [];
  items.forEach((it, i) => {
    const r = Math.max(2.5, (maxD / 2) * Math.sqrt(it.areaMm2 / maxArea));
    const cx = colW * i + colW / 2;
    parts.push(
      s("circle", { cx, cy: 8 + maxD / 2, r, class: `viz-wire is-${it.kind}` }),
      text(cx, maxD + 30, it.label, "viz-text strong"),
      text(cx, maxD + 46, it.sub),
    );
  });
  return svg(W, maxD + 52, `Cross-sections to scale: ${items.map((i) => `${i.label} (${i.sub})`).join(", ")}`, ...parts);
}

// ---------- Ruler ----------

/** One inch of ruler around the value, 1/16" ticks, with the value and nearest fractions marked. */
export function ruler(inches: number, marks: { at: number; label: string; kind: "exact" | "near" }[]): Element {
  const W = 320;
  const x0 = 14;
  const x1 = W - 14;
  const start = Math.floor(inches);
  const x = (v: number) => x0 + (v - start) * (x1 - x0);
  const parts: Element[] = [s("rect", { x: x0 - 6, y: 18, width: x1 - x0 + 12, height: 30, rx: 3, class: "viz-track" })];
  for (let i = 0; i <= 16; i++) {
    const h = i % 16 === 0 ? 18 : i % 8 === 0 ? 14 : i % 4 === 0 ? 10 : i % 2 === 0 ? 7 : 5;
    parts.push(s("line", { x1: x(start + i / 16), x2: x(start + i / 16), y1: 18, y2: 18 + h, class: "viz-tick" }));
  }
  parts.push(text(x0, 62, `${start}"`), text(x1, 62, `${start + 1}"`));
  marks.forEach((m, i) => {
    const mx = x(Math.min(Math.max(m.at, start), start + 1));
    parts.push(s("line", { x1: mx, x2: mx, y1: 12, y2: 48, class: `viz-pointer is-${m.kind}` }));
    parts.push(text(mx, i === 0 ? 9 : 62, m.label, `viz-text ${m.kind === "exact" ? "strong" : ""}`));
  });
  return svg(W, 68, `Ruler from ${start} to ${start + 1} inches: ${marks.map((m) => m.label).join(", ")}`, ...parts);
}

// ---------- Packs, coils and reels ----------

/**
 * One shape per pack (up to 12), the last one filled only as far as it's used, so the extra
 * shows. `lastUsed` is 0–1.
 */
export function packs(opts: { count: number; lastUsed: number; shape: "box" | "reel"; label: string }): Element {
  const shown = Math.min(opts.count, 12);
  const size = 30;
  const gap = 8;
  const W = Math.max(shown * (size + gap) + (opts.count > shown ? 60 : 0), 200);
  const parts: Element[] = [];
  for (let i = 0; i < shown; i++) {
    const x = i * (size + gap) + 4;
    const last = i === shown - 1 && opts.count === shown;
    const used = last ? opts.lastUsed : 1;
    if (opts.shape === "box") {
      parts.push(s("rect", { x, y: 6, width: size, height: size, rx: 4, class: "viz-pack" }));
      if (used > 0) parts.push(s("rect", { x, y: 6 + size * (1 - used), width: size, height: size * used, rx: 4, class: "viz-pack-used" }));
    } else {
      const cx = x + size / 2;
      parts.push(s("circle", { cx, cy: 6 + size / 2, r: size / 2, class: "viz-pack" }));
      if (used > 0) parts.push(s("circle", { cx, cy: 6 + size / 2, r: (size / 2) * Math.sqrt(used), class: "viz-pack-used" }));
      parts.push(s("circle", { cx, cy: 6 + size / 2, r: 4, class: "viz-hub" }));
    }
  }
  if (opts.count > shown) parts.push(text(shown * (size + gap) + 10, 26, `+ ${opts.count - shown} more`, "viz-text", "start"));
  parts.push(text(4, size + 26, opts.label, "viz-text", "start"));
  return svg(W, size + 32, opts.label, ...parts);
}

// ---------- Temperature ----------

/** A −40 to 120 °C scale with the usual conductor ratings marked. */
export function temperatureScale(celsius: number): Element {
  const W = 320;
  const lo = -40;
  const hi = 120;
  const x = (c: number) => 12 + ((Math.min(Math.max(c, lo), hi) - lo) / (hi - lo)) * (W - 24);
  const parts: Element[] = [s("rect", { x: 12, y: 24, width: W - 24, height: 10, rx: 5, class: "viz-temp" })];
  for (const [c, label] of [[0, "0 °C"], [60, "60"], [75, "75"], [90, "90 °C"]] as const) {
    parts.push(s("line", { x1: x(c), x2: x(c), y1: 20, y2: 38, class: "viz-mark" }), text(x(c), 52, label));
  }
  parts.push(
    s("circle", { cx: x(celsius), cy: 29, r: 7, class: "viz-dot" }),
    text(Math.min(Math.max(x(celsius), 30), W - 30), 14, `${fmt(celsius, 1)} °C`, "viz-text strong"),
  );
  return svg(W, 58, `${fmt(celsius, 1)} °C on a scale from −40 to 120 °C with 60, 75 and 90 °C ratings marked`, ...parts);
}

// ---------- Two prices on a log scale ----------

/** Both prices on a log axis; a 10×/100×/1000× gap shows as whole decades. */
export function priceGap(a: number, b: number, factor: number | undefined): Element {
  const W = 320;
  const lo = Math.floor(Math.log10(Math.min(a, b))) - 0.3;
  const hi = Math.ceil(Math.log10(Math.max(a, b))) + 0.3;
  const x = (v: number) => 16 + ((Math.log10(v) - lo) / (hi - lo)) * (W - 32);
  const parts: Element[] = [s("line", { x1: 16, x2: W - 16, y1: 34, y2: 34, class: "viz-axis" })];
  for (let d = Math.ceil(lo); d <= Math.floor(hi); d++) {
    parts.push(s("line", { x1: x(10 ** d), x2: x(10 ** d), y1: 30, y2: 38, class: "viz-tick" }), text(x(10 ** d), 54, fmt(10 ** d, 4)));
  }
  const status = factor ? "bad" : "good";
  parts.push(
    s("line", { x1: x(Math.min(a, b)), x2: x(Math.max(a, b)), y1: 34, y2: 34, class: `viz-span is-${status}` }),
    s("circle", { cx: x(a), cy: 34, r: 6, class: "viz-dot" }),
    s("circle", { cx: x(b), cy: 34, r: 6, class: "viz-dot" }),
    text(x(a), 20, "A", "viz-text strong"),
    text(x(b), 20, "B", "viz-text strong"),
  );
  return svg(W, 60, `Price A and B on a logarithmic scale${factor ? `, ${factor} times apart` : ""}`, ...parts);
}
