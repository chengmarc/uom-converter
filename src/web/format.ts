// Region-aware numbers: display formatting, clipboard values, money, and parsing what people type.
// The page sets the region's style before rendering; every converter formats through here.

export interface NumberStyle {
  /** Intl locale for display, e.g. "en-US" or "de-DE". */
  locale: string;
  /** Input uses "," as the decimal separator (1.234,5). */
  decimalComma: boolean;
  currency: string;
  /** "12,50 €" rather than "$12.50". */
  currencyAfter: boolean;
}

let style: NumberStyle = { locale: "en-US", decimalComma: false, currency: "$", currencyAfter: false };

export function setNumberStyle(s: NumberStyle) {
  style = s;
}

/** The current region's number style, e.g. to place the currency symbol in a field. */
export const numberStyle = () => style;

export const fmt = (n: number, max: number, min = 0) =>
  new Intl.NumberFormat(style.locale, { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);

/** Plain number for the clipboard: no thousands separators, the region's decimal mark. */
export const plain = (n: number, max: number) =>
  new Intl.NumberFormat(style.locale, { maximumFractionDigits: max, useGrouping: false }).format(n);

/** A number as the user would type it in this region, for example values: 2.5 → "2,5" in Europe. */
export const typed = (n: number) => plain(n, 6);

/** About six significant digits, never fewer than 2 decimals: $0.00123, $1.47638, $1,476.38. */
export const money = (n: number) => {
  const mag = n === 0 ? 0 : Math.floor(Math.log10(Math.abs(n)));
  const num = fmt(n, Math.min(5, Math.max(2, 5 - mag)), 2);
  return style.currencyAfter ? `${num} ${style.currency}` : `${style.currency}${num}`;
};

/**
 * Accepts "1,250.50" / "1.250,50" (per the region), "$0.45", "12 €", and "-40" when `signed`.
 * A dot is always read as a decimal point when there's no comma, since spreadsheets and UK
 * users write 1.5 everywhere. Returns undefined for blank, NaN for anything else.
 */
export function parseNumber(raw: string, signed = false): number | undefined {
  let s = raw.replace(/[$€£\s  ]/g, "");
  if (s === "") return undefined;
  if (style.decimalComma && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const re = signed ? /^-?(\d*\.?\d+|\d+\.)$/ : /^(\d*\.?\d+|\d+\.)$/;
  return re.test(s) ? Number(s) : NaN;
}
