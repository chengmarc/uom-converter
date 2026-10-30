import { suspectUomMismatch } from "@uom/core/pricing";
import { fmt, money, moneyAmount, plain, typed } from "./format";
import type { Converter, Example, Status } from "./model";
import { priceGap } from "./visual";
import { invalid } from "./checks";
import { t } from "@uom/i18n";

const mixupMeaning = (factor: number) =>
  factor === 10 ? t("a per-10 or pack-of-10 price") : factor === 100 ? t("a per-100 (C) price") : t("a per-1,000 (M) price");

export const mixup: Converter = {
  id: "mixup",
  topic: "Product data",
  title: "UOM mix-up check",
  blurb: "Compare the same item's price from two sources. About 10×, 100× or 1000× apart almost always means one was loaded in the wrong UOM.",
  empty: "Enter both prices.",
  examples: (): Example[] => [
    { label: t("{a} vs {b}", { a: money(1.25), b: money(125) }), set: { a: typed(1.25), b: "125" } },
    { label: t("{a} vs {b}", { a: money(450), b: money(0.46) }), set: { a: "450", b: typed(0.46) } },
    { label: t("{a} vs {b}", { a: money(10), b: money(12) }), set: { a: "10", b: "12" } },
  ],
  fields: [
    { kind: "number", id: "a", label: "Price A (e.g. your system)", currency: true, placeholder: typed(1.25) },
    { kind: "number", id: "b", label: "Price B (e.g. supplier file)", currency: true, placeholder: typed(125) },
  ],
  compute(v) {
    const a = v.num("a");
    const b = v.num("b");
    const bad = invalid([
      ["a", Number.isNaN(a) || a === 0],
      ["b", Number.isNaN(b) || b === 0],
    ]);
    if (bad.length) return { error: "Enter prices above 0.", fields: bad };
    if (a === undefined || b === undefined) return undefined;
    const f = suspectUomMismatch(a, b);
    const [hi, lo] = b > a ? ["B", "A"] : ["A", "B"];
    return {
      heading: t("{a} vs {b}", { a: money(a), b: money(b) }),
      rows: [
        f
          ? { label: "Likely UOM mix-up", detail: t("If {lo} is per each, {hi} is probably {meaning}.", { lo, hi, meaning: mixupMeaning(f) }), value: t("{f}× apart", { f }), status: "bad" as Status }
          : { label: "No UOM mix-up pattern", detail: "Not near 10×, 100× or 1000×: a real price difference, not a UOM problem.", value: "OK", status: "good" as Status },
        { label: "B ÷ A", value: `× ${fmt(b / a, 4)}`, copy: plain(b / a, 4) },
        ...(f ? [{ label: t("{hi} corrected", { hi }), detail: `${hi} ÷ ${f}`, ...moneyAmount((b > a ? b : a) / f) }] : []),
      ],
      visual: priceGap(a, b, f),
      formula: ["Flags a ratio within 5% of 10, 100 or 1000."],
    };
  },
};
