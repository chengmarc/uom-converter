import { suspectUomMismatch } from "@uom/core/pricing";
import { FT_PER_M, LB_PER_KG } from "@uom/core/units";
import { fmt, money, moneyAmount, plain, typed } from "./format";
import type { Converter, Example, Status } from "./model";
import { priceGap } from "./visual";
import { invalid } from "./checks";
import { t } from "@uom/i18n";

/** What a suspected factor would mean, with the lower price as `lo` and the higher as `hi`. */
function mixupMeaning(factor: number, lo: string, hi: string) {
  if (factor === FT_PER_M) return t("A price per foot and the same price per metre differ by this much.");
  if (factor === LB_PER_KG) return t("A price per pound and the same price per kilogram differ by this much.");
  const meaning =
    factor === 10 ? t("a per-10 or pack-of-10 price")
    : factor === 12 ? t("a per-dozen price")
    : factor === 100 ? t("a per-100 (C) price")
    : factor === 1000 ? t("a per-1,000 (M) price")
    : t("a price for a box of {n}", { n: factor });
  return t("If {lo} is per each, {hi} is probably {meaning}.", { lo, hi, meaning });
}

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
          ? { label: "Likely UOM mix-up", detail: mixupMeaning(f, lo, hi), value: t("{f}× apart", { f: fmt(f, 2) }), status: "bad" as Status }
          : { label: "No common mix-up ratio", detail: "Probably a real price difference, though an unusual pack size could still explain it.", value: "OK", status: "good" as Status },
        { label: "B ÷ A", value: `× ${fmt(b / a, 4)}`, copy: plain(b / a, 4) },
        ...(f ? [{ label: t("{hi} corrected", { hi }), detail: `${hi} ÷ ${fmt(f, 2)}`, ...moneyAmount((b > a ? b : a) / f) }] : []),
      ],
      visual: priceGap(a, b, f),
      formula: ["Flags a ratio within 15% of 10, 100 or 1000.", "Also within 5% of 12 (dozen), 25 or 50 (box), 3.28 (ft to m) or 2.2 (lb to kg)."],
    };
  },
};
