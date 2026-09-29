import { conductorInfo, conductorKgPerKm, kgPerKmToLbPerKft, type ConductorInfo, type Metal, type Phase, type Region } from "../../src/reference";
import { fmt, plain, type Example, type Row, type Values } from "../ui";
import { regionInfo } from "../regions";

export const isNum = (n: number | undefined): n is number => n !== undefined && !Number.isNaN(n);

/** Collects field ids whose value is present but invalid. */
export function invalid(checks: [string, boolean][]) {
  return checks.filter(([, bad]) => bad).map(([id]) => id);
}

/**
 * Examples that differ by region; regions left out use the US ones. Built when a converter
 * renders, so numbers in labels use that region's format.
 */
export type RegionExamples = Partial<Record<Region, Example[]>> & { us: Example[] };
export const byRegion =
  (ex: () => RegionExamples) =>
  (v: Values): Example[] => {
    const all = ex();
    return all[v.region] ?? all.us;
  };

export const phaseName = (p: Phase) => (p === 3 ? "three-phase" : "single-phase");
export const info = (s: string) => conductorInfo(s) as ConductorInfo;

export const metalField = {
  kind: "choice" as const,
  id: "metal",
  label: "Metal (for weight)",
  advanced: true,
  options: [
    { value: "Cu", label: "Copper" },
    { value: "Al", label: "Aluminum" },
  ],
};

export function weightRows(areaMm2: number, metal: Metal): Row[] {
  const kgKm = conductorKgPerKm(areaMm2, metal);
  const lb = kgPerKmToLbPerKft(kgKm);
  const group = `Weight, bare ${metal === "Cu" ? "copper" : "aluminum"}`;
  return [
    { group, label: "Pounds per 1,000 ft", value: `${fmt(lb, 1)} lb`, copy: plain(lb, 1) },
    { group, label: "Kilograms per km", value: `${fmt(kgKm, 1)} kg`, copy: plain(kgKm, 1) },
  ];
}

export const WIRE_FORMULA = [
  "AWG diameter = 0.127 mm × 92^((36 − gauge) ÷ 39), the ASTM B258 definition. 1/0 is gauge 0, 4/0 is gauge −3.",
  "1 kcmil = 1,000 circular mils = 0.5067 mm².",
  "Weight = area × density: copper 8.89 g/cm³, aluminum 2.705 g/cm³. Bare solid metal; stranding adds about 2%, insulation not included.",
];

export const phaseField = (value: string, advanced = false) => ({
  kind: "choice" as const,
  id: "phase",
  label: "Phase",
  value,
  advanced,
  options: [
    { value: "1", label: "Single-phase" },
    { value: "3", label: "Three-phase" },
  ],
});

/** A voltage field offering the region's voltages, preset to its load or branch-circuit voltage. */
export const voltsField = (label: string, preset: "loadVolts" | "branchVolts" = "loadVolts") => ({
  kind: "number" as const,
  id: "volts",
  label,
  suffix: "V",
  value: (v: Values) => regionInfo(v.region)[preset],
  list: (v: Values) => regionInfo(v.region).volts,
});
