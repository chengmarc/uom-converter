// Product-data (PIM) unit handling: UN/ECE unit codes, normalizing imperial spec values to
// the metric units ETIM features use, and price-quantity arithmetic.

import {
  BTUH_PER_W,
  conductorInfo,
  fToC,
  LB_PER_KG,
  LUX_PER_FC,
  MM_PER_IN,
  NM_PER_LBF_IN,
  parseInches,
  W_PER_HP,
} from "./reference";

// ---------- UN/ECE unit codes ----------

export type UomCategory =
  | "count"
  | "package"
  | "length"
  | "area"
  | "volume"
  | "mass"
  | "temperature"
  | "electrical"
  | "power & energy"
  | "torque"
  | "light"
  | "other";

export interface UomCode {
  /** UN/ECE Recommendation 20 common code (package types: Rec 21 code with an X prefix). */
  code: string;
  name: string;
  symbol?: string;
  category: UomCategory;
  /** Other ways the unit shows up in supplier files and ERP exports, matched case-insensitively. */
  aliases: string[];
  note?: string;
}

const PACKAGE_NOTE =
  "Package type from UN/ECE Rec 21, written with an X prefix when used as a unit (the bare code is withdrawn from Rec 20).";

/**
 * A curated subset of UN/ECE Rec 20 (and Rec 21 package types) for electrical products.
 * Codes and names checked against the Rec 20 code list and the Peppol "Recommendation 20,
 * including Recommendation 21 codes - prefixed with X" list.
 */
export const UOM_CODES: UomCode[] = [
  { code: "C62", name: "one (unit)", category: "count", aliases: ["unit", "units", "u"], note: "The generic count unit in many EDI and e-invoicing profiles." },
  { code: "EA", name: "each", category: "count", aliases: ["each", "e", "ea."], note: "Common in North American EDI; some systems require C62 or H87 instead." },
  { code: "H87", name: "piece", category: "count", aliases: ["piece", "pieces", "pc", "pcs", "pce", "stk", "st"] },
  { code: "PR", name: "pair", category: "count", aliases: ["pair", "pairs", "pr."] },
  { code: "SET", name: "set", category: "count", aliases: ["set", "sets", "kit"] },
  { code: "DZN", name: "dozen", category: "count", aliases: ["dozen", "dz", "doz"] },
  { code: "CEN", name: "hundred", category: "count", aliases: ["hundred", "c", "/100", "per 100"], note: "The C in E/C/M pricing." },
  { code: "MIL", name: "thousand", category: "count", aliases: ["thousand", "m", "/1000", "per 1000"], note: 'The M in E/C/M pricing. Upper-case M is read as thousand, lower-case m as metre: check the column before trusting either.' },

  { code: "XBX", name: "box", category: "package", aliases: ["bx", "box", "boxes"], note: PACKAGE_NOTE },
  { code: "XCT", name: "carton", category: "package", aliases: ["ct", "ctn", "carton"], note: PACKAGE_NOTE },
  { code: "XCS", name: "case", category: "package", aliases: ["cs", "ca", "case", "cases"], note: PACKAGE_NOTE },
  { code: "XPK", name: "package", category: "package", aliases: ["pk", "pkg", "pack", "package"], note: PACKAGE_NOTE },
  { code: "XBG", name: "bag", category: "package", aliases: ["bg", "bag"], note: PACKAGE_NOTE },
  { code: "XBE", name: "bundle", category: "package", aliases: ["be", "bdl", "bundle"], note: PACKAGE_NOTE },
  { code: "XRO", name: "roll", category: "package", aliases: ["ro", "roll"], note: PACKAGE_NOTE },
  { code: "XCL", name: "coil", category: "package", aliases: ["cl", "coil"], note: PACKAGE_NOTE },
  { code: "XRL", name: "reel", category: "package", aliases: ["rl", "reel", "spool"], note: PACKAGE_NOTE },
  { code: "XPX", name: "pallet", category: "package", aliases: ["px", "plt", "pallet"], note: PACKAGE_NOTE },

  { code: "MTR", name: "metre", symbol: "m", category: "length", aliases: ["meter", "meters", "metres", "mtr"] },
  { code: "KMT", name: "kilometre", symbol: "km", category: "length", aliases: ["kilometer"] },
  { code: "CMT", name: "centimetre", symbol: "cm", category: "length", aliases: ["centimeter"] },
  { code: "MMT", name: "millimetre", symbol: "mm", category: "length", aliases: ["millimeter"] },
  { code: "FOT", name: "foot", symbol: "ft", category: "length", aliases: ["feet", "'"] },
  { code: "INH", name: "inch", symbol: "in", category: "length", aliases: ["inches", '"'] },
  { code: "LM", name: "linear metre", category: "length", aliases: ["linear meter", "lin m"] },
  { code: "LF", name: "linear foot", category: "length", aliases: ["linear feet", "lin ft", "lft"] },

  { code: "MMK", name: "square millimetre", symbol: "mm²", category: "area", aliases: ["mm2", "sq mm", "square millimeter"] },
  { code: "MTK", name: "square metre", symbol: "m²", category: "area", aliases: ["m2", "sq m", "sqm", "square meter"] },
  { code: "INK", name: "square inch", symbol: "in²", category: "area", aliases: ["in2", "sq in"] },
  { code: "FTK", name: "square foot", symbol: "ft²", category: "area", aliases: ["ft2", "sq ft", "sqft"] },

  { code: "LTR", name: "litre", symbol: "l", category: "volume", aliases: ["liter", "liters", "litres", "ltr"] },
  { code: "MLT", name: "millilitre", symbol: "ml", category: "volume", aliases: ["milliliter", "ml"] },
  { code: "CMQ", name: "cubic centimetre", symbol: "cm³", category: "volume", aliases: ["cm3", "cc", "cubic centimeter"] },
  { code: "INQ", name: "cubic inch", symbol: "in³", category: "volume", aliases: ["in3", "cu in"] },

  { code: "KGM", name: "kilogram", symbol: "kg", category: "mass", aliases: ["kilo", "kgs"] },
  { code: "GRM", name: "gram", symbol: "g", category: "mass", aliases: ["gr", "grams"] },
  { code: "LBR", name: "pound", symbol: "lb", category: "mass", aliases: ["lbs", "pounds", "#"] },
  { code: "ONZ", name: "ounce (avoirdupois)", symbol: "oz", category: "mass", aliases: ["ounce", "ounces"] },
  { code: "M31", name: "kilogram per kilometre", symbol: "kg/km", category: "mass", aliases: [] },
  { code: "P2", name: "pound per foot", symbol: "lb/ft", category: "mass", aliases: [] },

  { code: "CEL", name: "degree Celsius", symbol: "°C", category: "temperature", aliases: ["deg c", "celsius", "c°"] },
  { code: "FAH", name: "degree Fahrenheit", symbol: "°F", category: "temperature", aliases: ["deg f", "fahrenheit", "f°"] },

  { code: "VLT", name: "volt", symbol: "V", category: "electrical", aliases: ["volts", "vac", "vdc"] },
  { code: "KVT", name: "kilovolt", symbol: "kV", category: "electrical", aliases: [] },
  { code: "AMP", name: "ampere", symbol: "A", category: "electrical", aliases: ["amp", "amps"] },
  { code: "4K", name: "milliampere", symbol: "mA", category: "electrical", aliases: [] },
  { code: "OHM", name: "ohm", symbol: "Ω", category: "electrical", aliases: ["ohms"] },
  { code: "F56", name: "ohm per kilometre", symbol: "Ω/km", category: "electrical", aliases: ["ohm/km"] },
  { code: "HTZ", name: "hertz", symbol: "Hz", category: "electrical", aliases: [] },

  { code: "WTT", name: "watt", symbol: "W", category: "power & energy", aliases: ["watts"] },
  { code: "KWT", name: "kilowatt", symbol: "kW", category: "power & energy", aliases: [] },
  { code: "KVA", name: "kilovolt-ampere", symbol: "kV·A", category: "power & energy", aliases: ["kva"] },
  { code: "KVR", name: "kilovar", symbol: "kvar", category: "power & energy", aliases: ["kvar"] },
  { code: "KWH", name: "kilowatt hour", symbol: "kW·h", category: "power & energy", aliases: ["kwh"] },
  { code: "BHP", name: "brake horse power", symbol: "BHP", category: "power & energy", aliases: ["hp", "horsepower"], note: "745.7 W. Metric horsepower (735.5 W) is HJ." },
  { code: "2I", name: "BTU (IT) per hour", symbol: "BtuIT/h", category: "power & energy", aliases: ["btu/h", "btu/hr", "btuh"] },

  { code: "NU", name: "newton metre", symbol: "N·m", category: "torque", aliases: ["nm", "n-m", "n.m"] },
  { code: "F21", name: "pound-force inch", symbol: "lbf·in", category: "torque", aliases: ["lb-in", "in-lb", "in-lbs", "lbf-in", "lb in"] },
  { code: "M92", name: "pound-force foot", symbol: "lbf·ft", category: "torque", aliases: ["lb-ft", "ft-lb", "ft-lbs", "lbf-ft"] },

  { code: "LUM", name: "lumen", symbol: "lm", category: "light", aliases: ["lumens"] },
  { code: "LUX", name: "lux", symbol: "lx", category: "light", aliases: [] },
  { code: "P27", name: "footcandle", symbol: "ftc", category: "light", aliases: ["fc", "foot-candle", "foot candle"] },

  { code: "HUR", name: "hour", symbol: "h", category: "other", aliases: ["hr", "hrs", "hours"] },
  { code: "RPM", name: "revolutions per minute", symbol: "r/min", category: "other", aliases: [] },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Find a unit by code, name, symbol or common alias. Codes win over aliases, so "CS" is the
 * case package and "C" is hundred. Returns undefined when nothing matches.
 */
export function lookupUom(raw: string): UomCode | undefined {
  const s = norm(raw);
  if (s === "") return undefined;
  // Case decides the one clash that matters: SI "m" is metre, pricing "M" is thousand.
  if (raw.trim() === "M") return UOM_CODES.find((u) => u.code === "MIL");
  return (
    UOM_CODES.find((u) => u.code.toLowerCase() === s) ??
    UOM_CODES.find((u) => u.code.startsWith("X") && u.code.slice(1).toLowerCase() === s) ??
    UOM_CODES.find((u) => norm(u.name) === s || (u.symbol && norm(u.symbol) === s)) ??
    UOM_CODES.find((u) => u.aliases.some((a) => norm(a) === s))
  );
}

// ---------- Normalize to metric (ETIM feature units) ----------

export interface MetricValue {
  value: number;
  /** Metric unit symbol, e.g. "mm²". */
  unit: string;
  /** UN/ECE Rec 20 code for `unit`. */
  code: string;
  /** How the input was read, e.g. "12 AWG" or "1-1/4 in". */
  readAs: string;
}

interface Rule {
  /** Unit spellings after the number, lower-case. */
  units: string[];
  to: string;
  code: string;
  convert: (n: number) => number;
  from: string;
}

const RULES: Rule[] = [
  { units: ["in", "in.", "inch", "inches", '"', "″"], to: "mm", code: "MMT", convert: (n) => n * MM_PER_IN, from: "in" },
  { units: ["ft", "ft.", "feet", "foot", "'", "′"], to: "m", code: "MTR", convert: (n) => n * 0.3048, from: "ft" },
  { units: ["yd", "yds", "yard", "yards"], to: "m", code: "MTR", convert: (n) => n * 0.9144, from: "yd" },
  { units: ["sq in", "in2", "in²", "square inch", "square inches"], to: "mm²", code: "MMK", convert: (n) => n * MM_PER_IN ** 2, from: "in²" },
  { units: ["sq ft", "ft2", "ft²", "square foot", "square feet"], to: "m²", code: "MTK", convert: (n) => n * 0.09290304, from: "ft²" },
  { units: ["cu in", "in3", "in³", "cubic inch", "cubic inches"], to: "cm³", code: "CMQ", convert: (n) => n * 16.387064, from: "in³" },
  { units: ["lb", "lbs", "lb.", "pound", "pounds"], to: "kg", code: "KGM", convert: (n) => n / LB_PER_KG, from: "lb" },
  { units: ["oz", "ounce", "ounces"], to: "g", code: "GRM", convert: (n) => (n / LB_PER_KG / 16) * 1000, from: "oz" },
  { units: ["°f", "f", "deg f", "degf", "º f", "ºf", "° f"], to: "°C", code: "CEL", convert: fToC, from: "°F" },
  { units: ["lbf·in", "lbf-in", "lb-in", "lb in", "in-lb", "in-lbs", "in lb", "in·lb", "inch-pounds", "inch pounds", "lbf in"], to: "N·m", code: "NU", convert: (n) => n * NM_PER_LBF_IN, from: "lbf·in" },
  { units: ["lbf·ft", "lbf-ft", "lb-ft", "ft-lb", "ft-lbs", "ft lb", "ft·lb", "foot-pounds", "foot pounds"], to: "N·m", code: "NU", convert: (n) => n * NM_PER_LBF_IN * 12, from: "lbf·ft" },
  { units: ["hp", "horsepower"], to: "kW", code: "KWT", convert: (n) => (n * W_PER_HP) / 1000, from: "hp" },
  { units: ["btu/h", "btu/hr", "btuh", "btu per hour"], to: "W", code: "WTT", convert: (n) => n / BTUH_PER_W, from: "BTU/h" },
  { units: ["fc", "ftc", "foot-candle", "foot-candles", "footcandles"], to: "lx", code: "LUX", convert: (n) => n * LUX_PER_FC, from: "fc" },
  // Already metric: pass through with a tidy unit.
  { units: ["mm"], to: "mm", code: "MMT", convert: (n) => n, from: "mm" },
  { units: ["cm"], to: "mm", code: "MMT", convert: (n) => n * 10, from: "cm" },
  { units: ["m", "metre", "meter", "metres", "meters"], to: "m", code: "MTR", convert: (n) => n, from: "m" },
  { units: ["km"], to: "m", code: "MTR", convert: (n) => n * 1000, from: "km" },
  { units: ["mm2", "mm²", "sq mm"], to: "mm²", code: "MMK", convert: (n) => n, from: "mm²" },
  { units: ["kg"], to: "kg", code: "KGM", convert: (n) => n, from: "kg" },
  { units: ["g"], to: "g", code: "GRM", convert: (n) => n, from: "g" },
  { units: ["°c", "c", "deg c", "degc", "ºc", "º c", "° c"], to: "°C", code: "CEL", convert: (n) => n, from: "°C" },
  { units: ["nm", "n·m", "n-m", "n.m"], to: "N·m", code: "NU", convert: (n) => n, from: "N·m" },
  { units: ["kw"], to: "kW", code: "KWT", convert: (n) => n, from: "kW" },
  { units: ["w", "watt", "watts"], to: "W", code: "WTT", convert: (n) => n, from: "W" },
  { units: ["lx", "lux"], to: "lx", code: "LUX", convert: (n) => n, from: "lx" },
];

const AWG_HINT = /(awg|kcmil|mcm|^#\s*\d)|^\d\/0$/i;

/**
 * Read a spec value with its unit ("12 AWG", '1-1/4"', "75 ft", "167 °F", "20 lb-in") and
 * return it in the metric unit ETIM features use. Wire sizes become mm² (from the AWG
 * definition). Returns an error for anything it can't read confidently.
 */
export function toMetric(raw: string): MetricValue | { error: string } {
  const s = raw.trim().replace(/\s+/g, " ");
  if (s === "") return { error: "Empty" };

  if (AWG_HINT.test(s)) {
    const c = conductorInfo(s);
    if ("error" in c) return c;
    return { value: c.areaMm2, unit: "mm²", code: "MMK", readAs: c.label };
  }

  // Number (decimal, fraction or mixed fraction), then the unit.
  const m = /^(-)?\s*(\d+[\s-]+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(.*)$/.exec(s);
  if (!m) return { error: "No number found" };
  const [, minus, num, unitRaw] = m;
  const unit = unitRaw.toLowerCase().replace(/\.$/, "").trim();
  if (unit === "") return { error: "No unit: add one, like 12 AWG, 3/4 in or 75 ft" };
  const rule = RULES.find((r) => r.units.includes(unit));
  if (!rule) return { error: `Unknown unit "${unitRaw}"` };

  const n = num.includes("/") ? parseInches(num) : Number(num);
  if (n === undefined || Number.isNaN(n)) return { error: "Can't read the number" };
  const value = minus ? -n : n;
  return { value: rule.convert(value), unit: rule.to, code: rule.code, readAs: `${minus ?? ""}${num} ${rule.from}` };
}

// ---------- Price quantity ----------

/**
 * Price files (BMEcat, most ERPs) give a price for a *price quantity* of *order units*, and
 * each order unit can hold several *content units* (e.g. a box of 100 connectors).
 */
export function unitPrice(price: number, priceQuantity = 1, contentUnitsPerOrderUnit = 1) {
  const perOrderUnit = price / priceQuantity;
  return { perOrderUnit, perContentUnit: perOrderUnit / contentUnitsPerOrderUnit };
}
