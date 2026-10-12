// Input checks shared by converters with several number fields.

export const isNum = (n: number | undefined): n is number => n !== undefined && !Number.isNaN(n);

/** Collects field ids whose value is present but invalid. */
export function invalid(checks: [string, boolean][]) {
  return checks.filter(([, bad]) => bad).map(([id]) => id);
}
