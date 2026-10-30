import { motorSlip, polesForRpm, syncSpeedRpm } from "@uom/core/electrical";
import { regionInfo } from "./regions";
import { amount, fmt } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row } from "./model";
import { isNum, invalid } from "./checks";
import { t } from "@uom/i18n";

export const motor: Converter = {
  id: "motor",
  topic: "Electrical",
  title: "Motor speed & slip",
  blurb: "Synchronous speed from frequency and poles, slip from the nameplate speed, and the same motor on the other frequency.",
  empty: "Enter the poles, the nameplate speed, or both.",
  note: "A 60 Hz motor on 50 Hz runs about 17% slower and its voltage must drop in proportion (e.g. 460 V → 380 V); check the nameplate before using a motor on the other frequency.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "1,750 r/min nameplate", set: { hz: "60", rpm: "1750" } },
      { label: "3,550 r/min nameplate", set: { hz: "60", rpm: "3550" } },
      { label: "6-pole at 60 Hz", set: { hz: "60", poles: "6" } },
    ],
    eu: [
      { label: "1.450 r/min nameplate", set: { hz: "50", rpm: "1450" } },
      { label: "2.900 r/min nameplate", set: { hz: "50", rpm: "2900" } },
      { label: "6-pole at 50 Hz", set: { hz: "50", poles: "6" } },
    ],
  })),
  fields: [
    {
      kind: "choice",
      id: "hz",
      label: "Supply frequency",
      value: (v) => String(regionInfo(v.region).hz),
      options: [
        { value: "60", label: "60 Hz" },
        { value: "50", label: "50 Hz" },
      ],
    },
    { kind: "number", id: "rpm", label: "Nameplate speed", suffix: "r/min", placeholder: "1750", optional: true },
    { kind: "number", id: "poles", label: "Poles", placeholder: "4", list: ["2", "4", "6", "8", "10", "12"], optional: true },
  ],
  compute(v) {
    const hz = Number(v.str("hz"));
    const polesIn = v.num("poles");
    const rpm = v.num("rpm");
    const bad = invalid([
      ["poles", Number.isNaN(polesIn) || (isNum(polesIn) && (polesIn < 2 || polesIn % 2 !== 0))],
      ["rpm", Number.isNaN(rpm) || rpm === 0],
    ]);
    if (bad.length) return { error: "Poles is an even number (2, 4, 6…); speed is above 0.", fields: bad };
    if (polesIn === undefined && rpm === undefined) return undefined;

    const poles = polesIn ?? polesForRpm(hz, rpm!);
    if (poles === undefined) return { error: t("Faster than a 2-pole motor at {hz} Hz ({rpm} r/min).", { hz, rpm: fmt(syncSpeedRpm(hz, 2), 0) }), fields: ["rpm"] };
    const sync = syncSpeedRpm(hz, poles);
    if (rpm !== undefined && rpm > sync) return { error: t("A {poles}-pole motor at {hz} Hz can't run faster than {rpm} r/min.", { poles, hz, rpm: fmt(sync, 0) }), fields: ["rpm", "poles"] };

    const other = hz === 60 ? 50 : 60;
    const rows: Row[] = [{ label: "Synchronous speed", ...amount(sync, 0, " r/min") }];
    if (polesIn === undefined) rows.push({ label: "Poles", detail: "worked out from the nameplate speed", value: String(poles) });
    if (rpm !== undefined) {
      const slip = motorSlip(sync, rpm);
      rows.push({ label: "Slip", detail: t("{rpm} r/min below synchronous", { rpm: fmt(sync - rpm, 0) }), ...amount(slip * 100, 2, "%") });
    }
    const g = t("On {hz} Hz", { hz: other });
    rows.push({ group: g, label: "Synchronous speed", ...amount(syncSpeedRpm(other, poles), 0, " r/min") });
    if (rpm !== undefined) rows.push({ group: g, label: "Running speed, about", detail: "same slip", ...amount((rpm * other) / hz, 0, " r/min") });
    return {
      heading: rpm !== undefined ? t("{poles}-pole motor at {hz} Hz, {rpm} r/min nameplate", { poles, hz, rpm: fmt(rpm, 0) }) : t("{poles}-pole motor at {hz} Hz", { poles, hz }),
      rows,
      formula: ["Synchronous speed = 120 × frequency ÷ poles.", "Slip = (synchronous − nameplate) ÷ synchronous.", "Poles from a nameplate: the pole count whose synchronous speed is just above it."],
    };
  },
};
