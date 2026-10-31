import { conductorInfo, conductorKgPerKm, kgPerKmToLbPerKft, NA_WIRE_SIZES, STRANDING } from "@uom/core/conductors";
import { metalSurcharge } from "@uom/core/pricing";
import { M_PER_FT } from "@uom/core/units";
import { fmt, money, moneyAmount, typed } from "./format";
import type { Converter, Example } from "./model";
import { invalid, isNum } from "./checks";
import { metalField, readMetal } from "./wire";
import { t } from "@uom/i18n";

export const surcharge: Converter = {
  id: "surcharge",
  topic: "Pricing & ordering",
  title: "Metal surcharge",
  blurb: "What a copper or aluminum move adds to wire: pounds of metal per M ft × (spot − base).",
  empty: "Enter the wire size, spot price and base price.",
  note: "Counts bare stranded metal only. Check how your supplier's price sheet defines its base and how often it resets. Below the base, it's a credit.",
  examples: (): Example[] => [
    { label: t("12 AWG copper, {spot} spot, {base} base", { spot: money(4.5), base: money(3) }), set: { size: "12", metal: "Cu", spot: typed(4.5), base: "3" } },
    { label: t("4/0 aluminum, {spot} spot, {base} base", { spot: money(1.3), base: money(1) }), set: { size: "4/0", metal: "Al", spot: typed(1.3), base: "1" } },
  ],
  fields: [
    { kind: "text", id: "size", label: "Wire size", placeholder: "12, 1/0, 250 kcmil", list: NA_WIRE_SIZES.map((s) => s.label) },
    { kind: "number", id: "spot", label: "Spot price", currency: true, suffix: "per lb", placeholder: "4.50" },
    { kind: "number", id: "base", label: "Base price", currency: true, suffix: "per lb", placeholder: "3.00" },
    { ...metalField, advanced: false, label: "Conductor metal" },
  ],
  compute(v) {
    const raw = v.str("size");
    const spot = v.num("spot");
    const base = v.num("base");
    const bad = invalid([
      ["spot", Number.isNaN(spot)],
      ["base", Number.isNaN(base)],
    ]);
    if (bad.length) return { error: "Enter prices as numbers.", fields: bad };
    if (raw === "" || !isNum(spot) || !isNum(base)) return undefined;
    const c = conductorInfo(raw);
    if ("error" in c) return { error: t("{error}.", { error: c.error }), fields: ["size"] };
    const metal = readMetal(v);
    const lbPerMft = kgPerKmToLbPerKft(conductorKgPerKm(c.areaMm2, metal)) * STRANDING;
    const perMft = metalSurcharge(lbPerMft, spot, base);
    return {
      heading: metal === "Cu" ? t("{size} copper at {spot} per lb", { size: c.label, spot: money(spot) }) : t("{size} aluminum at {spot} per lb", { size: c.label, spot: money(spot) }),
      rows: [
        { label: perMft < 0 ? "Credit per M ft" : "Surcharge per M ft", ...moneyAmount(Math.abs(perMft)) },
        { label: "Per foot", ...moneyAmount(Math.abs(perMft) / 1000) },
        { label: "Per metre", ...moneyAmount(Math.abs(perMft) / (1000 * M_PER_FT)) },
        { label: "Metal in the wire", value: `${fmt(lbPerMft, 1)} lb / M ft` },
      ],
      formula: ["Surcharge per M ft = pounds of metal per M ft × (spot − base).", "Pounds of metal from area × density, plus 2% for stranding."],
    };
  },
};
