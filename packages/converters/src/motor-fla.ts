import { MOTOR_HP, motorCircuit, motorFullLoadAmps, motorOverloadAmps } from "@uom/core/motors";
import { amount, fmt } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row } from "./model";
import { isNum } from "./checks";
import { codeField, phaseField, phaseName, readCode, readPhase, voltsField } from "./electrical-fields";
import { t } from "@uom/i18n";

export const motorFla: Converter = {
  id: "motor-fla",
  topic: "Equipment",
  title: "Motor full-load amps",
  blurb: "Horsepower to code-table amps, with the wire and overcurrent protection for a single motor.",
  empty: "Choose the horsepower and voltage.",
  note: (v) =>
    v.region === "ca"
      ? "Currents are from NEC Tables 430.248 and 430.250; check them against CEC Tables 44 and 45. Up to 50 hp three-phase and 10 hp single-phase. Size overloads from the nameplate, not the table. The CEC holds protection to the next size down."
      : "Up to 50 hp three-phase and 10 hp single-phase, for induction motors at usual speeds. Size overloads from the nameplate, not the table. Low-speed, high-torque and multispeed motors go by the nameplate.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "10 hp, 460 V, 3-phase", set: { hp: "10", volts: "460", phase: "3" } },
      { label: "5 hp, 208 V, 3-phase", set: { hp: "5", volts: "208", phase: "3" } },
      { label: "1 hp, 115 V, 1-phase", set: { hp: "1", volts: "115", phase: "1" } },
    ],
    ca: [
      { label: "10 hp, 600 V, 3-phase", set: { hp: "10", volts: "600", phase: "3" } },
      { label: "5 hp, 208 V, 3-phase", set: { hp: "5", volts: "208", phase: "3" } },
      { label: "1 hp, 120 V, 1-phase", set: { hp: "1", volts: "120", phase: "1" } },
    ],
  })),
  fields: [
    {
      kind: "choice",
      id: "hp",
      label: "Horsepower",
      value: "5",
      columns: 5,
      options: MOTOR_HP.map((hp) => ({ value: hp, label: hp })),
    },
    voltsField("Motor voltage"),
    phaseField("3"),
    { kind: "number", id: "nameplate", label: "Nameplate amps (for overloads)", suffix: "A", optional: true },
    {
      kind: "choice",
      id: "sf",
      label: "Service factor",
      advanced: true,
      options: [
        { value: "high", label: "1.15 or more" },
        { value: "low", label: "Under 1.15" },
      ],
    },
    codeField(true),
  ],
  compute(v) {
    const hp = v.str("hp");
    const volts = v.num("volts");
    const nameplate = v.num("nameplate");
    if (!isNum(volts) || volts === 0) return { error: "Enter the motor voltage.", fields: ["volts"] };
    if (Number.isNaN(nameplate) || nameplate === 0) return { error: "Enter the nameplate amps above 0.", fields: ["nameplate"] };
    const phase = readPhase(v);
    const fla = motorFullLoadAmps(hp, volts, phase);
    if (fla === undefined) return { error: t("The tables have no {hp} hp {phase} motor at {volts} V.", { hp, phase: phaseName(phase), volts: fmt(volts, 1) }), fields: ["hp", "volts", "phase"] };
    const code = readCode(v);
    const c = motorCircuit(fla, code);
    const g = t("Most protection allowed");
    const device = (label: string, amps: number | undefined, percent: number): Row => ({ group: g, label, detail: t("{pct}% of table current", { pct: percent }), value: amps === undefined ? t("Over 1000 A") : `${amps} A`, copy: amps === undefined ? "" : String(amps) });
    const rows: Row[] = [
      { label: "Full-load current", detail: "code table, not the nameplate", ...amount(fla, 1, " A") },
      { label: "Conductor ampacity needed", detail: "125% of table current", ...amount(c.conductorAmps, 2, " A") },
      { label: "Smallest copper conductor", detail: "75 °C terminals, 30 °C, three conductors. Check voltage drop too.", value: c.size?.label ?? t("Over 2000 kcmil"), status: c.size ? undefined : "warn" },
      device(t("Inverse-time breaker"), c.breaker, 250),
      device(t("Time-delay fuse"), c.timeDelayFuse, 175),
      device(t("Non-time-delay fuse"), c.fastFuse, 300),
    ];
    if (nameplate !== undefined) rows.push({ label: "Overload setting, at most", detail: v.str("sf") === "high" ? "125% of nameplate" : "115% of nameplate", ...amount(motorOverloadAmps(nameplate, v.str("sf") === "high"), 2, " A") });
    return {
      heading: t("{hp} hp, {volts} V {phase} motor", { hp, volts: fmt(volts, 1), phase: phaseName(phase) }),
      rows,
      formula: [
        "Full-load current from NEC Tables 430.248 and 430.250, by motor rating: a 480 V system is the 460 V column.",
        "Conductors at 125% of table current; protection up to 250% for an inverse-time breaker, 175% for a time-delay fuse, 300% for a non-time-delay fuse.",
        code === "nec" ? "NEC: between standard sizes, the next size up is allowed." : "CEC: between standard sizes, use the next size down.",
      ],
    };
  },
};
