import { pvCircuitAmps, pvStringVolts } from "@uom/core/electrical";
import { amount, fmt, typed } from "./format";
import { byRegion, type Converter, type RegionExamples, type Status } from "./model";
import { invalid, isNum } from "./checks";
import { t } from "@uom/i18n";

export const pvString: Converter = {
  id: "pv-string",
  topic: "Electrical",
  title: "PV string voltage",
  blurb: "A cold morning raises a string's voltage. Check it against the system limit, and size the circuit current.",
  empty: "Enter the module's Voc and how many are in the string.",
  note: (v) =>
    v.region === "ca"
      ? "This applies the NEC's method (690.7 and 690.8). CEC Section 64 sets the rules in Canada: check them. Use the coefficient from the module's data sheet, and the record low for your site."
      : "NEC 690.7 and 690.8. Use the coefficient from the module's data sheet, and the record low for your site. Dwellings are limited to 600 V, other buildings usually to 1,000 V.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "12 × 49.5 V modules at −20 °C", set: { voc: typed(49.5), count: "12", coef: typed(-0.27), low: "-20", isc: typed(13.9), limit: "600" } },
      { label: "18 × 49.5 V modules at −10 °C", set: { voc: typed(49.5), count: "18", coef: typed(-0.27), low: "-10", isc: typed(13.9), limit: "1000" } },
    ],
    ca: [
      { label: "10 × 49.5 V modules at −35 °C", set: { voc: typed(49.5), count: "10", coef: typed(-0.27), low: "-35", isc: typed(13.9), limit: "600" } },
    ],
  })),
  fields: [
    { kind: "number", id: "voc", label: "Module Voc", suffix: "V", placeholder: typed(49.5) },
    { kind: "number", id: "count", label: "Modules in series", placeholder: "12" },
    { kind: "number", id: "coef", label: "Voc temperature coefficient", suffix: "%/°C", value: () => typed(-0.27), signed: true },
    { kind: "number", id: "low", label: "Lowest expected temperature", suffix: "°C", signed: true, placeholder: "-20" },
    { kind: "number", id: "isc", label: "Module Isc", suffix: "A", optional: true },
    { kind: "number", id: "strings", label: "Strings in parallel", value: "1", advanced: true },
    {
      kind: "choice",
      id: "limit",
      label: "System voltage limit",
      options: [
        { value: "600", label: "600 V" },
        { value: "1000", label: "1,000 V" },
        { value: "1500", label: "1,500 V" },
      ],
    },
  ],
  compute(v) {
    const voc = v.num("voc");
    const count = v.num("count");
    const coef = v.num("coef");
    const low = v.num("low");
    const isc = v.num("isc");
    const strings = v.num("strings");
    const whole = (n: number | undefined) => Number.isNaN(n) || (n !== undefined && (n < 1 || !Number.isInteger(n)));
    const bad = invalid([
      ["voc", Number.isNaN(voc) || voc === 0],
      ["count", whole(count)],
      ["coef", !isNum(coef) || coef >= 0],
      ["low", Number.isNaN(low)],
      ["isc", Number.isNaN(isc) || isc === 0],
      ["strings", !isNum(strings) || whole(strings)],
    ]);
    if (bad.length) return { error: "Enter numbers above 0; the coefficient is negative, and modules and strings are whole numbers.", fields: bad };
    if (voc === undefined || count === undefined || low === undefined) return undefined;
    const limit = Number(v.str("limit"));
    const s = pvStringVolts(voc, count, coef!, low, limit);
    const status: Status = s.stringVolts <= limit ? "good" : "bad";
    const current = isc === undefined ? undefined : pvCircuitAmps(isc, strings!);
    return {
      heading: t("{n} modules at {low} °C", { n: fmt(count, 0), low: fmt(low, 1) }),
      rows: [
        { label: "String voltage when cold", detail: t("{limit} V limit", { limit: fmt(limit, 0) }), ...amount(s.stringVolts, 1, " V"), status },
        { label: "Most modules in series", value: fmt(s.maxModules, 0) },
        { label: "Module Voc when cold", ...amount(s.coldVoc, 2, " V") },
        ...(current === undefined
          ? []
          : [
              { label: "Maximum circuit current", detail: "125% of Isc", ...amount(current.circuit, 1, " A") },
              { label: "Conductor ampacity needed", detail: "156% of Isc", ...amount(current.ampacity, 1, " A") },
            ]),
      ],
      formula: ["Cold Voc = Voc × (1 + coefficient × (lowest temperature − 25 °C)).", "String voltage = cold Voc × modules in series.", "Maximum circuit current = Isc × strings × 125%; conductors carry 125% of that again."],
    };
  },
};
