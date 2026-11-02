import { smallestSizeForAmps } from "@uom/core/ampacity";
import { ratingAtLeast } from "@uom/core/ratings";
import { amount, fmt } from "./format";
import { byRegion, type Converter, type RegionExamples } from "./model";
import { regionInfo } from "./regions";
import { invalid, isNum } from "./checks";
import { phaseField, phaseName, readPhase, voltsField } from "./electrical-fields";
import { metalField, readMetal } from "./wire";
import { ampsToKva } from "@uom/core/electrical";
import { t } from "@uom/i18n";

export const evCharger: Converter = {
  id: "ev-charger",
  topic: "Lighting, EV & solar",
  title: "EV charger circuit",
  blurb: "The breaker and wire for a charger, treated as a continuous load at 125%.",
  empty: "Enter the charger's rated current.",
  note: (v) =>
    v.region === "ca"
      ? "This applies the NEC's 125% rule (625.40 and 625.41). CEC Section 86 and any load management system can change the answer: check them in Canada. Wire is at 60 °C up to 1 AWG."
      : "NEC 625.40 and 625.41: chargers are continuous loads, sized at 125% of their rating. A listed load management system can lower the feeder load. Wire is at 60 °C up to 1 AWG, and voltage drop is separate.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "32 A charger at 240 V", set: { amps: "32", volts: "240", phase: "1" } },
      { label: "48 A charger at 240 V", set: { amps: "48", volts: "240", phase: "1" } },
    ],
    ca: [
      { label: "32 A charger at 240 V", set: { amps: "32", volts: "240", phase: "1" } },
      { label: "48 A charger at 208 V", set: { amps: "48", volts: "208", phase: "1" } },
    ],
  })),
  fields: [
    { kind: "number", id: "amps", label: "Charger rated current", suffix: "A", placeholder: "32" },
    voltsField("Supply voltage"),
    phaseField("1"),
    { ...metalField, label: "Conductor metal" },
  ],
  compute(v) {
    const a = v.num("amps");
    const volts = v.num("volts");
    const bad = invalid([
      ["amps", Number.isNaN(a) || a === 0],
      ["volts", !isNum(volts) || volts === 0],
    ]);
    if (bad.length) return { error: "Enter numbers above 0.", fields: bad };
    if (a === undefined) return undefined;
    const phase = readPhase(v);
    const continuous = a * 1.25;
    const breaker = ratingAtLeast(continuous);
    const size = breaker === undefined ? undefined : smallestSizeForAmps(breaker, { metal: readMetal(v), insulation: 75, ambientC: 30, conductors: 3, code: regionInfo(v.region).wiringCode });
    return {
      heading: t("{amps} A charger at {volts} V {phase}", { amps: fmt(a, 1), volts: fmt(volts!, 1), phase: phaseName(phase) }),
      rows: [
        { label: "Breaker, at least", detail: t("{amps} A at 125%", { amps: fmt(continuous, 1) }), value: breaker === undefined ? t("Over 2000 A") : `${breaker} A`, copy: breaker === undefined ? "" : String(breaker) },
        { label: "Wire for that breaker", detail: "75 °C insulation, 30 °C, three conductors", value: size?.label ?? t("Over 2000 kcmil"), status: size ? undefined : "warn" },
        { label: "Charging power", ...amount(ampsToKva(a, volts!, phase), 1, " kW") },
      ],
      formula: ["Breaker = charger amps × 125%, up to the next standard size.", "Wire has to carry the breaker's rating."],
    };
  },
};
