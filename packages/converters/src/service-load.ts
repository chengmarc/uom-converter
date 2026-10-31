import { smallestSizeForAmps, type WiringCode } from "@uom/core/ampacity";
import { cecDwelling, necDwelling } from "@uom/core/dwelling";
import { amount, fmt } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row, type Values } from "./model";
import { invalid, isNum } from "./checks";
import { t } from "@uom/i18n";

const code = (v: Values) => v.str("code") as WiringCode;
const LOADS = ["range", "ac", "heat", "hot", "ev", "other"];

export const serviceLoad: Converter = {
  id: "service-load",
  topic: "Power & loads",
  title: "House service size",
  blurb: "The calculated load of a single dwelling and the service it needs, by the NEC optional method or CEC Rule 8-200.",
  empty: "Enter the living area and the fixed loads.",
  note: (v) =>
    v.region === "eu"
      ? "A North American dwelling calculation for 240 V services. European services are sized to national rules."
      : "A single dwelling on a 240 V service only. Check the result with your inspector: local rules add to these, and this is a load calculation, not a design. The conductor shown is at 75 °C in a raceway.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "1,500 ft², 22.6 kW appliances, 10 kW heat", set: { area: "1500", other: "22600", heat: "10000", ac: "3910" } },
      { label: "2,400 ft², range, A/C and EV charger", set: { area: "2400", range: "12000", ac: "5000", ev: "7200", other: "9000" } },
    ],
    ca: [
      { label: "269 m², range, A/C, hot tub, EV charger", set: { area: "269", range: "11000", ac: "6000", hot: "8000", ev: "7200", other: "9500" } },
      { label: "120 m², range and dryer", set: { area: "120", range: "12000", other: "5000" } },
    ],
  })),
  fields: [
    {
      kind: "choice",
      id: "code",
      label: "Wiring code",
      value: (v) => (v.region === "ca" ? "cec" : "nec"),
      options: [
        { value: "nec", label: "NEC" },
        { value: "cec", label: "CEC" },
      ],
    },
    { kind: "number", id: "area", label: (v) => (code(v) === "cec" ? "Living area (basement at 75%)" : "Living area"), suffix: (v) => (code(v) === "cec" ? "m²" : "ft²"), placeholder: (v) => (code(v) === "cec" ? "150" : "2000") },
    { kind: "number", id: "range", label: "Electric range", suffix: "W", optional: true },
    { kind: "number", id: "ac", label: "Air conditioning", suffix: "W", optional: true },
    { kind: "number", id: "heat", label: "Electric heating", suffix: "W", optional: true },
    { kind: "number", id: "hot", label: "Tankless, pool, spa or hot tub heaters", suffix: "W", optional: true },
    { kind: "number", id: "ev", label: "EV charger", suffix: "W", optional: true },
    { kind: "number", id: "other", label: "Other fixed loads over 1,500 W, added up", suffix: "W", optional: true },
    {
      kind: "choice",
      id: "interlock",
      label: "Heating and cooling (CEC)",
      advanced: true,
      options: [
        { value: "yes", label: "Can't run together" },
        { value: "no", label: "Can run together" },
      ],
    },
    {
      kind: "choice",
      id: "stat",
      label: "Electric heat control (CEC)",
      advanced: true,
      options: [
        { value: "central", label: "Furnace or duct heater" },
        { value: "room", label: "A thermostat in each room" },
      ],
    },
  ],
  compute(v) {
    const area = v.num("area");
    const bad = invalid([
      ["area", Number.isNaN(area) || area === 0],
      ...LOADS.map((id): [string, boolean] => [id, Number.isNaN(v.num(id))]),
    ]);
    if (bad.length) return { error: "Enter numbers; the living area is above 0.", fields: bad };
    if (!isNum(area)) return undefined;
    const wiring = code(v);
    const watts = (id: string) => v.num(id) ?? 0;
    const loads = { area, range: watts("range"), airConditioning: watts("ac"), heating: watts("heat"), hotLoads: watts("hot"), evCharger: watts("ev"), otherLoads: watts("other") };
    const w = (n: number) => amount(n, 0, " W");
    let parts: Row[];
    let r: { watts: number; amps: number; rating: number | undefined };
    if (wiring === "cec") {
      const c = cecDwelling(loads, v.str("interlock") === "yes", v.str("stat") === "room");
      r = c;
      parts = [
        { label: "Basic load", ...w(c.basic) },
        { label: "Heating and cooling", ...w(c.hvac) },
        { label: "Range", ...w(c.range) },
        { label: "Tankless, pool, spa or hot tub heaters", ...w(loads.hotLoads) },
        { label: "EV charger", ...w(loads.evCharger) },
        { label: "Other loads", detail: loads.range > 0 ? "25% with a range" : "100% to 6,000 W, then 25%", ...w(c.other) },
      ];
    } else {
      const n = necDwelling(loads);
      r = n;
      parts = [
        { label: "Connected general load", ...w(n.connected) },
        { label: "General load after demand", detail: "100% of the first 10 kVA, 40% of the rest", ...w(n.general) },
        { label: "Heating or cooling", detail: "the larger: A/C at 100%, heat at 65%", ...w(n.hvac) },
      ];
    }
    const size = r.rating === undefined ? undefined : smallestSizeForAmps(r.rating, { metal: "Cu", insulation: 75, ambientC: 30, conductors: 3, code: wiring, terminal: 75 });
    return {
      heading: wiring === "cec" ? t("{area} m² by CEC Rule 8-200", { area: fmt(area, 1) }) : t("{area} ft² by the NEC optional method", { area: fmt(area, 1) }),
      rows: [
        { label: "Service size, at least", detail: t("{amps} A calculated", { amps: fmt(r.amps, 1) }), value: r.rating === undefined ? t("Over 2000 A") : `${r.rating} A`, copy: r.rating === undefined ? "" : String(r.rating) },
        { label: "Calculated load", ...w(r.watts) },
        { label: "Copper conductor for that size", detail: "75 °C, in a raceway", value: size?.label ?? t("Over 2000 kcmil") },
        ...parts,
      ],
      formula: wiring === "cec"
        ? ["Basic load: 5,000 W for the first 90 m², plus 1,000 W for each further 90 m² or part of it.", "Range: 6,000 W up to 12 kW, plus 40% of anything over 12 kW.", "Minimum service: 100 A from 80 m², 60 A under that (floor area excluding the basement)."]
        : ["General load: 3 VA/ft², 4,500 VA for the small-appliance and laundry circuits, plus nameplate appliances.", "NEC 220.82 applies to a service of 100 A or more."],
    };
  },
};
