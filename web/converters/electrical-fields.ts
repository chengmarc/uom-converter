// Phase and voltage fields for the converters that work on a supply (load, fault, pf, vdrop).

import type { Phase } from "../../src/electrical";
import { regionInfo } from "../regions";
import type { Values } from "../ui";

export const phaseName = (p: Phase) => (p === 3 ? "three-phase" : "single-phase");

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
