import type { WiringCode } from "@uom/core/ampacity";
import type { Region } from "@uom/core/region";
import type { NumberStyle } from "./format";

interface RegionInfo {
  id: Region;
  label: string;
  /** The wiring code notes should cite. */
  code: string;
  /** The code a converter with NEC and CEC rules starts on, and the one a converter with no choice uses. */
  wiringCode: WiringCode;
  number: NumberStyle;
  hz: 50 | 60;
  /** Voltages offered in voltage fields, most common first. */
  volts: string[];
  /** Default voltage for load and fault-current fields. */
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
    wiringCode: "nec",
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
    wiringCode: "cec",
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
    wiringCode: "nec",
    number: { locale: "de-DE", decimalComma: true, currency: "€", currencyAfter: true },
    hz: 50,
    volts: ["230", "400", "690"],
    loadVolts: "400",
    branchVolts: "230",
    energyRate: "0,30",
  },
];

export const regionInfo = (id: Region) => REGIONS.find((r) => r.id === id)!;
