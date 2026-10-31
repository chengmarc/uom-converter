import { energyUse } from "@uom/core/electrical";
import { regionInfo } from "./regions";
import { amount, fmt, moneyAmount } from "./format";
import type { Converter, Example, Row } from "./model";
import { isNum, invalid } from "./checks";
import { t } from "@uom/i18n";

export const energy: Converter = {
  id: "energy",
  topic: "Power & loads",
  title: "Energy cost",
  blurb: "What a load costs to run, and what a retrofit saves.",
  empty: "Enter the load in watts and the hours it runs per day.",
  examples: (v): Example[] => {
    const rate = regionInfo(v.region).energyRate;
    return [
      { label: t("{watts} W heater, 8 h a day", { watts: fmt(1500, 0) }), set: { watts: "1500", hours: "8", rate } },
      { label: "LED retrofit 400 W → 150 W, 12 h", set: { watts: "400", hours: "12", rate, after: "150" } },
      { label: t("Parking lot lights {watts} W, 11 h", { watts: fmt(2000, 0) }), set: { watts: "2000", hours: "11", rate } },
    ];
  },
  fields: [
    { kind: "number", id: "watts", label: "Load", suffix: "W", placeholder: "1500" },
    { kind: "number", id: "hours", label: "Hours per day", suffix: "h", placeholder: "8" },
    { kind: "number", id: "rate", label: "Electricity rate", currency: true, suffix: "per kWh", placeholder: (v) => regionInfo(v.region).energyRate, optional: true },
    { kind: "number", id: "after", label: "Load after retrofit", suffix: "W", placeholder: "600", optional: true },
    { kind: "number", id: "days", label: "Days per year", value: "365", advanced: true },
  ],
  compute(v) {
    const watts = v.num("watts");
    const hours = v.num("hours");
    const days = v.num("days");
    const rate = v.num("rate");
    const after = v.num("after");
    const bad = invalid([
      ["watts", Number.isNaN(watts)],
      ["hours", Number.isNaN(hours) || (isNum(hours) && hours > 24)],
      ["days", !isNum(days) || days > 366],
      ["rate", Number.isNaN(rate)],
      ["after", Number.isNaN(after)],
    ]);
    if (bad.length) return { error: "Enter numbers; at most 24 hours a day and 366 days a year.", fields: bad };
    if (watts === undefined || hours === undefined) return undefined;
    const e = energyUse(watts, hours, days!, rate ?? 0);
    const rows: Row[] = [];
    if (after !== undefined) {
      const saved = energyUse(watts - after, hours, days!, rate ?? 0);
      const g = t("Retrofit saves ({before} W → {after} W)", { before: fmt(watts, 0), after: fmt(after, 0) });
      if (rate !== undefined) rows.push({ group: g, label: "Money per year", ...moneyAmount(saved.costPerYear, 2), status: saved.costPerYear > 0 ? "good" : "warn" });
      rows.push({ group: g, label: "Energy per year", ...amount(saved.kwhPerYear, 0, " kWh") });
    }
    if (rate !== undefined) {
      rows.push(
        { group: "Cost", label: "Per year", ...moneyAmount(e.costPerYear, 2) },
        { group: "Cost", label: "Per month", ...moneyAmount(e.costPerYear / 12, 2) },
        { group: "Cost", label: "Per day", ...moneyAmount(e.costPerDay, 2) },
      );
    }
    rows.push(
      { group: "Energy", label: "Per year", ...amount(e.kwhPerYear, 0, " kWh") },
      { group: "Energy", label: "Per day", ...amount(e.kwhPerDay, 2, " kWh") },
    );
    return {
      heading: t("{watts} W for {hours} h a day, {days} days a year", { watts: fmt(watts, 0), hours: fmt(hours, 2), days: fmt(days!, 0) }),
      rows,
      formula: ["kWh = watts × hours ÷ 1,000.", "Cost = kWh × rate. Per month = per year ÷ 12."],
    };
  },
};
