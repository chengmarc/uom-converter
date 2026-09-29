// Unit factors (exact or defined values), temperature, and fractions of an inch.

// ---------- Length ----------

/** 1 ft = 0.3048 m exactly (the international foot). */
export const M_PER_FT = 0.3048;
export const FT_PER_M = 1 / M_PER_FT;
export const ftToM = (ft: number) => ft * M_PER_FT;
export const MM_PER_IN = 25.4;

// ---------- Other unit factors ----------

/** Mechanical horsepower (550 ft·lbf/s). Output power only: says nothing about motor current. */
export const W_PER_HP = 745.69987158227022;
/** International Table BTU. */
export const BTUH_PER_W = 3.412141633127942;
/** 1 fc = 1 lm/ft² = 1 / 0.09290304 lx. */
export const LUX_PER_FC = 1 / 0.09290304;
/** 1 lbf·in = 4.4482216152605 N × 0.0254 m. */
export const NM_PER_LBF_IN = 4.4482216152605 * 0.0254;
export const CM3_PER_IN3 = 16.387064;
export const LB_PER_KG = 2.20462262185;

export const fToC = (f: number) => ((f - 32) * 5) / 9;
export const cToF = (c: number) => (c * 9) / 5 + 32;

// ---------- Fractions of an inch ----------

/** Accepts 1-23/32 (with or without an inch mark), "1 23/32", "23/32", "1.719", ".5 in". */
export function parseInches(raw: string): number | undefined {
  const s = raw.trim().toLowerCase().replace(/(["″]|\s*(in|inch|inches)\.?)$/, "").trim();
  const m = /^(?:(\d+)[\s-]+)?(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[3]) === 0 ? undefined : Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
  return /^(\d+(\.\d*)?|\.\d+)$/.test(s) ? Number(s) : undefined;
}

/** Nearest fraction with the given denominator, reduced: 1.71875 -> 1-23/32 inches. */
export function toFraction(inches: number, denominator = 64): { label: string; value: number; error: number } {
  const total = Math.round(inches * denominator);
  const whole = Math.floor(total / denominator);
  let num = total - whole * denominator;
  let den = denominator;
  while (num > 0 && num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  const frac = num === 0 ? "" : `${num}/${den}`;
  const label = (whole && frac ? `${whole}-${frac}` : whole ? `${whole}` : frac || "0") + '"';
  const value = total / denominator;
  return { label, value, error: value - inches };
}
