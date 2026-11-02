// Phase, voltage and wiring code fields for the converters that work on a supply (load, fault, pf, vdrop).

import type { WiringCode } from "@uom/core/ampacity";
import type { Phase } from "@uom/core/electrical";
import { regionInfo } from "./regions";
import type { Values } from "./model";
import { t } from "@uom/i18n";

export const phaseName = (p: Phase) => (p === 3 ? t("three-phase") : t("single-phase"));

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

/** The phase chosen in a phaseField. */
export const readPhase = (v: Values) => Number(v.str("phase")) as Phase;

/** A voltage field offering the region's voltages, preset to its load or branch-circuit voltage. */
export const voltsField = (label: string, preset: "loadVolts" | "branchVolts" = "loadVolts") => ({
  kind: "number" as const,
  id: "volts",
  label,
  suffix: "V",
  value: (v: Values) => regionInfo(v.region)[preset],
  list: (v: Values) => regionInfo(v.region).volts,
});

/** The wiring code to work by, preset to the region's. */
export const codeField = (advanced = false) => ({
  kind: "choice" as const,
  id: "code",
  label: "Wiring code",
  value: (v: Values) => regionInfo(v.region).wiringCode,
  advanced,
  options: [
    { value: "nec", label: "NEC" },
    { value: "cec", label: "CEC" },
  ],
});

/** The code chosen in a codeField. */
export const readCode = (v: Values) => v.str("code") as WiringCode;
