// GTIN / UPC / EAN identifier math. Pure functions, no data required.
//
// Every GTIN format (GTIN-8, UPC-A = GTIN-12, EAN-13, GTIN-14) is the same
// number padded with leading zeros to 14 digits, and leading zeros never
// change the GS1 check digit. That's why everything here normalizes to
// GTIN-14 first.

import { t } from "@uom/i18n";

interface GtinResult {
  valid: boolean;
  gtin14?: string;
  errors: string[];
}

/** GS1 mod-10 check digit for a code body (everything except the check digit). */
export function checkDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    // Weights alternate 3,1,3,1... starting from the rightmost body digit.
    const fromRight = body.length - 1 - i;
    sum += Number(body[i]) * (fromRight % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function hasValidCheckDigit(code: string): boolean {
  return /^\d{2,}$/.test(code) && checkDigit(code.slice(0, -1)) === Number(code.at(-1));
}

/** Expand an 8-digit UPC-E (number system + 6 digits + check) to 12-digit UPC-A. */
export function expandUpcE(upcE: string): string {
  if (!/^[01]\d{7}$/.test(upcE)) throw new Error("UPC-E must be 8 digits starting with 0 or 1");
  const ns = upcE[0];
  const [d1, d2, d3, d4, d5, d6] = upcE.slice(1, 7);
  const check = upcE[7];
  let middle: string;
  switch (d6) {
    case "0":
    case "1":
    case "2":
      middle = d1 + d2 + d6 + "0000" + d3 + d4 + d5;
      break;
    case "3":
      middle = d1 + d2 + d3 + "00000" + d4 + d5;
      break;
    case "4":
      middle = d1 + d2 + d3 + d4 + "00000" + d5;
      break;
    default:
      middle = d1 + d2 + d3 + d4 + d5 + "0000" + d6;
  }
  return ns + middle + check;
}

/** Build a case/pack GTIN-14 from an item GTIN with packaging indicator 1-8. */
export function makePackGtin14(itemGtin: string, indicator: number): string {
  if (!Number.isInteger(indicator) || indicator < 1 || indicator > 8) {
    throw new Error("Indicator must be 1-8");
  }
  const parsed = parseGtin(itemGtin);
  if (!parsed.valid || !parsed.gtin14) throw new Error(`Not a valid GTIN: ${itemGtin}`);
  const body = String(indicator) + parsed.gtin14.slice(1, 13);
  return body + checkDigit(body);
}

const SCIENTIFIC = /^\d(\.\d+)?e\+?\d+$/i;

export function parseGtin(raw: string): GtinResult {
  const r: GtinResult = { valid: false, errors: [] };
  let s = raw.trim();

  if (SCIENTIFIC.test(s)) {
    r.errors.push(
      t("Excel scientific notation (e.g. 7.12E+11): the trailing digits are already lost and can't be recovered. Re-export the column formatted as Text."),
    );
    return r;
  }

  // Common spreadsheet/copy-paste junk: leading apostrophe, separators, trailing ".0".
  s = s.replace(/^'/, "").replace(/[\s-]/g, "").replace(/\.0+$/, "");
  if (s === "") {
    r.errors.push(t("Empty"));
    return r;
  }
  if (!/^\d+$/.test(s)) {
    r.errors.push(t("Contains non-digit characters"));
    return r;
  }
  if (s.length > 14) {
    r.errors.push(t("Too long ({n} digits; max is 14)", { n: s.length }));
    return r;
  }

  // 8 digits starting with 0 or 1 are usually UPC-E in North America. Anything else short is
  // padded like the rest: a UPC-A under 12 digits has usually had its leading zeros stripped by Excel.
  const normalized = s.length === 8 && /^[01]/.test(s) ? expandUpcE(s) : s;
  const gtin14 = normalized.padStart(14, "0");
  if (!hasValidCheckDigit(gtin14)) {
    const expected = checkDigit(gtin14.slice(0, 13));
    r.errors.push(t("Bad check digit: last digit is {last}, expected {expected}", { last: gtin14[13], expected }));
    return r;
  }

  r.valid = true;
  r.gtin14 = gtin14;
  return r;
}
