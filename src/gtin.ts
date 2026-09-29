// GTIN / UPC / EAN identifier math. Pure functions, no data required.
//
// Every GTIN format (GTIN-8, UPC-A = GTIN-12, EAN-13, GTIN-14) is the same
// number padded with leading zeros to 14 digits, and leading zeros never
// change the GS1 check digit. That's why everything here normalizes to
// GTIN-14 first.

export type GtinKind = "GTIN-8" | "UPC-E" | "UPC-A" | "EAN-13" | "GTIN-14";

export interface GtinOptions {
  /** How to read 8-digit codes starting with 0 or 1. North America: usually UPC-E. */
  eightDigit?: "upc-e" | "gtin-8";
}

export interface GtinResult {
  input: string;
  valid: boolean;
  kind?: GtinKind;
  gtin14?: string;
  /** Only when the code fits in 12 digits (GTIN-14 starts with "00"). */
  upcA?: string;
  /** Only when the code fits in 13 digits (GTIN-14 starts with "0"). */
  ean13?: string;
  /** GTIN-14 indicator digit (1-8 = packaging level, 9 = variable measure). */
  indicator?: number;
  /** For case/pack GTIN-14s: the likely inner item (common convention, not guaranteed). */
  likelyInnerItem?: string;
  errors: string[];
  warnings: string[];
  notes: string[];
  /** A best-guess corrected code, when the input looks recoverable. */
  suggestion?: string;
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

export function hasValidCheckDigit(code: string): boolean {
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

export function parseGtin(raw: string, opts: GtinOptions = {}): GtinResult {
  const r: GtinResult = { input: raw, valid: false, errors: [], warnings: [], notes: [] };
  let s = raw.trim();

  if (SCIENTIFIC.test(s)) {
    r.errors.push(
      "Excel scientific notation (e.g. 7.12E+11): the trailing digits are already lost and can't be recovered. Re-export the column formatted as Text.",
    );
    return r;
  }

  // Common spreadsheet/copy-paste junk: leading apostrophe, separators, trailing ".0".
  s = s.replace(/^'/, "").replace(/[\s-]/g, "").replace(/\.0+$/, "");
  if (s === "") {
    r.errors.push("Empty");
    return r;
  }
  if (!/^\d+$/.test(s)) {
    r.errors.push("Contains non-digit characters");
    return r;
  }
  if (s.length > 14) {
    r.errors.push(`Too long (${s.length} digits; max is 14)`);
    return r;
  }

  let kind: GtinKind;
  let normalized = s;

  if (s.length === 8 && /^[01]/.test(s) && (opts.eightDigit ?? "upc-e") === "upc-e") {
    kind = "UPC-E";
    normalized = expandUpcE(s);
    r.notes.push(`UPC-E expanded to UPC-A ${normalized}`);
  } else if (s.length === 8) {
    kind = "GTIN-8";
  } else if (s.length === 12) {
    kind = "UPC-A";
  } else if (s.length === 13) {
    kind = "EAN-13";
  } else if (s.length === 14) {
    kind = "GTIN-14";
  } else {
    // 9-11 digits (or <8): almost always a UPC-A whose leading zeros Excel stripped.
    kind = "UPC-A";
    normalized = s.padStart(12, "0");
    r.warnings.push(
      `Only ${s.length} digits: restored ${12 - s.length} leading zero(s), likely stripped by a spreadsheet.`,
    );
  }

  const gtin14 = normalized.padStart(14, "0");
  if (!hasValidCheckDigit(gtin14)) {
    const expected = checkDigit(gtin14.slice(0, 13));
    r.errors.push(`Bad check digit: last digit is ${gtin14[13]}, expected ${expected}`);
    if (s.length === 11) {
      // 11 digits could also be a full UPC-A body with the check digit dropped.
      r.suggestion = s + checkDigit(s);
      r.notes.push(`If this is a UPC missing its check digit, the full UPC-A is ${r.suggestion}`);
    }
    r.kind = kind;
    return r;
  }

  r.valid = true;
  r.kind = kind;
  r.gtin14 = gtin14;
  if (kind !== "GTIN-8") {
    if (gtin14.startsWith("00")) r.upcA = gtin14.slice(2);
    if (gtin14.startsWith("0")) r.ean13 = gtin14.slice(1);
  }

  const indicator = Number(gtin14[0]);
  if (indicator >= 1 && indicator <= 8) {
    r.indicator = indicator;
    const innerBody = "0" + gtin14.slice(1, 13);
    r.likelyInnerItem = (innerBody + checkDigit(innerBody)).replace(/^0/, "");
    r.notes.push(
      `Indicator ${indicator}: case/pack-level GTIN. Inner item is usually ${r.likelyInnerItem} (convention, verify with supplier).`,
    );
  } else if (indicator === 9) {
    r.indicator = 9;
    r.notes.push("Indicator 9: variable-measure trade item.");
  }

  addPrefixNotes(r, gtin14);
  return r;
}

function addPrefixNotes(r: GtinResult, gtin14: string): void {
  if (r.kind === "GTIN-8") return; // GTIN-8 prefixes follow a different allocation.
  const p = Number(gtin14.slice(1, 4)); // GS1 prefix of the 13-digit form
  if ((p >= 20 && p <= 29) || (p >= 40 && p <= 49) || (p >= 200 && p <= 299)) {
    r.warnings.push(
      "Restricted-circulation prefix: an internal/in-store code, not a globally unique GTIN.",
    );
  } else if ((p >= 50 && p <= 59) || (p >= 981 && p <= 999)) {
    r.warnings.push("Coupon/voucher prefix: not a product GTIN.");
  } else if (p === 754 || p === 755) {
    r.notes.push("Issued by GS1 Canada (prefix reflects the issuing office, not country of origin).");
  } else if (p <= 19 || (p >= 30 && p <= 39) || (p >= 60 && p <= 139)) {
    r.notes.push("Issued by GS1 US (prefix reflects the issuing office, not country of origin).");
  } else if (p === 750) {
    r.notes.push("Issued by GS1 Mexico (prefix reflects the issuing office, not country of origin).");
  }
}
