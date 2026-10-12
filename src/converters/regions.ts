import type { Region } from "../core/region";
import type { NumberStyle } from "./format";

export interface RegionInfo {
  id: Region;
  label: string;
  /** The wiring code notes should cite. */
  code: string;
  number: NumberStyle;
  hz: 50 | 60;
  /** Voltages offered in voltage fields, most common first. */
  volts: string[];
  /** Default voltage for load, fault-current and voltage-drop fields. */
  loadVolts: string;
  /** Default for branch-circuit fields (voltage drop). */
  branchVolts: string;
  /** Placeholder electricity rate per kWh. */
  energyRate: string;
}

export const REGIONS: RegionInfo[] = [
  {
    id: "us",
    label: "US",
    code: "NEC",
    number: { locale: "en-US", decimalComma: false, currency: "$", currencyAfter: false },
    hz: 60,
    volts: ["120", "208", "240", "277", "480"],
    loadVolts: "208",
    branchVolts: "120",
    energyRate: "0.15",
  },
  {
    id: "ca",
    label: "Canada",
    code: "CEC",
    number: { locale: "en-CA", decimalComma: false, currency: "$", currencyAfter: false },
    hz: 60,
    volts: ["120", "208", "240", "347", "600"],
    loadVolts: "600",
    branchVolts: "120",
    energyRate: "0.12",
  },
  {
    id: "eu",
    label: "Europe",
    code: "IEC 60364",
    number: { locale: "de-DE", decimalComma: true, currency: "€", currencyAfter: true },
    hz: 50,
    volts: ["230", "400", "690"],
    loadVolts: "400",
    branchVolts: "230",
    energyRate: "0,30",
  },
];

export const regionInfo = (id: Region) => REGIONS.find((r) => r.id === id)!;

/** A first guess from the browser language: en-US → US, *-CA → Canada, European languages → Europe. */
export function guessRegion(): Region {
  const lang = (navigator.language || "en-US").toLowerCase();
  if (lang.endsWith("-ca")) return "ca";
  if (lang === "en-us" || lang === "en" || lang.endsWith("-us")) return "us";
  if (/^(de|fr|nl|it|es|pt|sv|da|nb|nn|no|fi|pl|cs|sk|hu|ro|el|bg|hr|sl|et|lv|lt)\b/.test(lang) || lang === "en-gb" || lang === "en-ie") return "eu";
  return "us";
}
