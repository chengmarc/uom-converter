// Conductor metal and weight, for the wire-size converters (awg, mm2, vdrop).

import { conductorInfo, conductorKgPerKm, kgPerKmToLbPerKft, type ConductorInfo, type Metal } from "../../src/conductors";
import { fmt, plain } from "../format";
import type { Row } from "../ui";

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
