import { energyUse } from "../../core/electrical";
import { regionInfo } from "../regions";
import { fmt, money, plain } from "../format";
import type { Converter, Example, Row } from "../ui";
import { isNum, invalid } from "./checks";

export const energy: Converter = {
  id: "energy",
  topic: "Electrical",
  title: "Energy cost",
  blurb: "What a load costs to run, and what a retrofit saves.",
  empty: "Enter the load in watts and the hours it runs per day.",
  examples: (v): Example[] => {
    const rate = regionInfo(v.region).energyRate;
    return [
      { label: `${fmt(1500, 0)} W heater, 8 h a day`, set: { watts: "1500", hours: "8", rate } },
      { label: "LED retrofit 400 W → 150 W, 12 h", set: { watts: "400", hours: "12", rate, after: "150" } },
      { label: `Parking lot lights ${fmt(2000, 0)} W, 11 h`, set: { watts: "2000", hours: "11", rate } },
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
      const g = `Retrofit saves (${fmt(watts, 0)} W → ${fmt(after, 0)} W)`;
      if (rate !== undefined) rows.push({ group: g, label: "Money per year", value: money(saved.costPerYear), copy: plain(saved.costPerYear, 2), status: saved.costPerYear > 0 ? "good" : "warn" });
      rows.push({ group: g, label: "Energy per year", value: `${fmt(saved.kwhPerYear, 0)} kWh`, copy: plain(saved.kwhPerYear, 0) });
    }
    if (rate !== undefined) {
      rows.push(
        { group: "Cost", label: "Per year", value: money(e.costPerYear), copy: plain(e.costPerYear, 2) },
        { group: "Cost", label: "Per month", value: money(e.costPerYear / 12), copy: plain(e.costPerYear / 12, 2) },
        { group: "Cost", label: "Per day", value: money(e.costPerDay), copy: plain(e.costPerDay, 2) },
      );
    }
    rows.push(
      { group: "Energy", label: "Per year", value: `${fmt(e.kwhPerYear, 0)} kWh`, copy: plain(e.kwhPerYear, 0) },
      { group: "Energy", label: "Per day", value: `${fmt(e.kwhPerDay, 2)} kWh`, copy: plain(e.kwhPerDay, 2) },
    );
    return {
      heading: `${fmt(watts, 0)} W for ${fmt(hours, 2)} h a day, ${fmt(days!, 0)} days a year`,
      rows,
      formula: ["kWh = watts × hours ÷ 1,000.", "Cost = kWh × rate. Per month = per year ÷ 12."],
    };
  },
};
