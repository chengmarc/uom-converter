import { conductorAmpacity, type TempRating, type WiringCode } from "@uom/core/ampacity";
import { buildingSizesFor, conductorInfo } from "@uom/core/conductors";
import { amount, fmt } from "./format";
import { byRegion, type Converter, type RegionExamples, type Row, type Status, type Values } from "./model";
import { invalid, isNum } from "./checks";
import { metalField, readMetal } from "./wire";
import { t } from "@uom/i18n";

const wiringCode = (v: Values) => v.str("code") as WiringCode;
const rating = (v: Values, id: string) => Number(v.str(id)) as TempRating;

export const ampacity: Converter = {
  id: "ampacity",
  topic: "Wire & conduit",
  title: "Conductor ampacity",
  blurb: "What a wire can really carry: the code table, derated for heat and bundling, and held to its terminals.",
  empty: "Enter a wire size.",
  note: (v) =>
    v.region === "eu"
      ? "These are NEC and CEC ratings for AWG and kcmil wire. IEC 60364-5-52 ratings for mm² cable aren't included."
      : "For three or fewer conductors the table applies as it stands. The NEC counts current-carrying conductors and the CEC counts all of them. The ambient factors are the NEC's; check CEC Table 5A in Canada.",
  examples: byRegion((): RegionExamples => ({
    us: [
      { label: "12 AWG THHN, 3 conductors, 30 °C", set: { size: "12", insulation: "90", ambient: "30", count: "3" } },
      { label: "6 AWG THHN, 6 conductors, 40 °C", set: { size: "6", insulation: "90", ambient: "40", count: "6" } },
      { label: "500 kcmil at 75 °C, 380 A load", set: { size: "500 kcmil", insulation: "75", ambient: "30", count: "3", load: "380" } },
    ],
    ca: [
      { label: "12 AWG RW90, 3 conductors, 30 °C", set: { size: "12", insulation: "90", ambient: "30", count: "3" } },
      { label: "6 AWG RW90, 6 conductors, 40 °C", set: { size: "6", insulation: "90", ambient: "40", count: "6" } },
      { label: "3/0 RW90, 150 A load", set: { size: "3/0", insulation: "90", ambient: "30", count: "3", load: "150" } },
    ],
  })),
  fields: [
    { kind: "text", id: "size", label: "Wire size", placeholder: "12, 1/0, 250 kcmil", list: (v) => buildingSizesFor(readMetal(v)).map((s) => s.label) },
    {
      kind: "choice",
      id: "insulation",
      label: "Insulation rating",
      value: "90",
      options: [
        { value: "60", label: "60 °C" },
        { value: "75", label: "75 °C" },
        { value: "90", label: "90 °C" },
      ],
    },
    { kind: "number", id: "ambient", label: "Ambient temperature", suffix: "°C", value: "30", signed: true },
    { kind: "number", id: "count", label: "Conductors in the raceway", value: "3" },
    { kind: "number", id: "load", label: "Load to check", suffix: "A", optional: true },
    { ...metalField, label: "Conductor metal" },
    {
      kind: "choice",
      id: "terminal",
      label: "Terminal rating",
      advanced: true,
      options: [
        { value: "auto", label: "Usual for the size" },
        { value: "60", label: "60 °C" },
        { value: "75", label: "75 °C" },
        { value: "90", label: "90 °C" },
      ],
    },
    {
      kind: "choice",
      id: "code",
      label: "Wiring code",
      advanced: true,
      value: (v) => (v.region === "ca" ? "cec" : "nec"),
      options: [
        { value: "nec", label: "NEC" },
        { value: "cec", label: "CEC" },
      ],
    },
  ],
  compute(v) {
    const raw = v.str("size");
    const ambientC = v.num("ambient");
    const count = v.num("count");
    const load = v.num("load");
    const bad = invalid([
      ["ambient", !isNum(ambientC)],
      ["count", !isNum(count) || count < 1 || !Number.isInteger(count)],
      ["load", Number.isNaN(load) || load === 0],
    ]);
    if (bad.length) return { error: "Enter numbers; conductors is a whole number of at least 1.", fields: bad };
    if (raw === "") return undefined;
    const c = conductorInfo(raw);
    if ("error" in c) return { error: t("{error}.", { error: c.error }), fields: ["size"] };
    const metal = readMetal(v);
    const insulation = rating(v, "insulation");
    const terminalChoice = v.str("terminal");
    const a = conductorAmpacity(c.label, {
      metal,
      insulation,
      ambientC: ambientC!,
      conductors: count!,
      code: wiringCode(v),
      terminal: terminalChoice === "auto" ? undefined : (Number(terminalChoice) as TempRating),
    });
    if (!a) return { error: t("No rating for {size} {metal} at {insulation} °C in {ambient} °C.", { size: c.label, metal, insulation, ambient: fmt(ambientC!, 1) }), fields: ["size", "ambient", "insulation"] };

    const limiter = a.usable === a.smallLimit ? t("held to the {amps} A limit for this size", { amps: a.smallLimit }) : a.usable === a.terminalLimit ? t("held to its {temp} °C terminals", { temp: a.terminal }) : t("after derating");
    const enough = load === undefined ? undefined : a.usable >= load;
    const status: Status | undefined = enough === undefined ? undefined : enough ? "good" : "bad";
    const rows: Row[] = [
      { label: "Usable ampacity", detail: limiter, ...amount(a.usable, 1, " A"), status },
      ...(load === undefined ? [] : [{ label: enough ? "Carries the load" : "Too small for the load", detail: t("{amps} A load", { amps: fmt(load, 1) }), ...amount(Math.abs(a.usable - load), 1, " A"), status }]),
      { label: t("Table value at {temp} °C", { temp: insulation }), ...amount(a.table, 0, " A") },
      { label: "Ambient factor", value: `× ${fmt(a.ambient, 2, 2)}` },
      { label: "Bundling factor", value: `× ${fmt(a.bundling, 2, 2)}` },
      { label: "After derating", ...amount(a.derated, 1, " A") },
      { label: t("Terminal limit at {temp} °C", { temp: a.terminal }), ...amount(a.terminalLimit, 0, " A") },
    ];
    return {
      heading: metal === "Cu" ? t("{size} copper, {temp} °C insulation", { size: c.label, temp: insulation }) : t("{size} aluminum, {temp} °C insulation", { size: c.label, temp: insulation }),
      rows,
      formula: [
        "Derated = table value × ambient factor × bundling factor, starting from the insulation rating.",
        "Usable = the lowest of the derated value, the table value at the terminal rating, and the small-conductor limit.",
        "Terminals are taken as 60 °C up to 1 AWG and 75 °C above it, unless the equipment is marked otherwise.",
        "Ampacities from NEC Table 310.16 (2020), which CEC Tables 2 and 4 (2024) match.",
      ],
    };
  },
};
