import { CONDUIT_TRADE_SIZES, conduitSize, euConduitSize, KNOCKOUT_PUNCH_IN } from "@uom/core/conduit";
import { MM_PER_IN } from "@uom/core/units";
import { dotDecimal, fmt, plain } from "./format";
import type { Converter, Example, Row } from "./model";
import { t } from "@uom/i18n";

export const conduit: Converter = {
  id: "conduit",
  topic: "Wire & conduit",
  title: "Conduit & knockouts",
  blurb: (v) =>
    v.region === "eu"
      ? "North American inch trade size ↔ metric designator, with the typical knockout punch diameter."
      : "Inch trade size ↔ metric designator (CEC / NEC), with the typical knockout punch diameter.",
  empty: 'Enter a trade size in either system: 1-1/4", 1.25 or 35.',
  examples: (): Example[] => [
    { label: '1/2"', set: { size: '1/2"' } },
    { label: '1-1/4"', set: { size: '1-1/4"' } },
    { label: "Metric 53", set: { size: "53" } },
  ],
  note: (v) =>
    v.region === "eu"
      ? "European conduit is sized by outside diameter (EN 61386: M16, M20, M25, M32…), which is a different system from these trade sizes. Punch diameters vary by a few thousandths between makers."
      : "Punch diameters vary by a few thousandths between makers; check the punch or box spec for a tight fit.",
  fields: [{ kind: "text", id: "size", label: "Trade size (inch or metric)", placeholder: '1-1/4" or 35' }],
  compute(v) {
    const raw = v.str("size");
    if (raw === "") return undefined;
    // In Europe an M size is an outside diameter, which only looks like a designator: M16 isn't 1/2".
    const eu = v.region === "eu" ? euConduitSize(raw) : undefined;
    if (eu && "error" in eu) return { error: t("{error}.", { error: eu.error }), fields: ["size"] };
    if (eu) {
      return {
        heading: t("European size M{n}", { n: eu.size }),
        rows: [
          { label: "Clearance hole, typical", detail: "check the gland maker's data", value: `${fmt(eu.holeMm, 1, 1)} mm`, copy: plain(eu.holeMm, 1) },
          { label: "Inch trade size", detail: "M sizes are outside diameters, not trade sizes", value: t("No equivalent"), copy: "" },
        ],
        formula: ["European sizes are outside diameters (EN 61386), with EN 60423 threads.", "Clearance hole = thread diameter + 0.5 mm, typically."],
      };
    }
    const c = conduitSize(dotDecimal(raw));
    if ("error" in c) return { error: t("{error}.", { error: c.error }), fields: ["size"] };
    const ko = KNOCKOUT_PUNCH_IN[c.inch];
    // Answer in the system the user didn't type.
    const typedMetric = c.typed === "metric";
    const inchRow: Row = { label: "Inch trade size", value: `${c.inch}"`, copy: c.inch };
    const metricRow: Row = { label: "Metric designator", value: String(c.metric) };
    return {
      heading: typedMetric ? t("Metric designator {n}", { n: c.metric }) : t('Trade size {size}"', { size: c.inch }),
      rows: [
        ...(typedMetric ? [inchRow, metricRow] : [metricRow, inchRow]),
        ko === undefined
          ? { label: "Knockout punch", value: t("Not listed"), copy: "", status: "warn" }
          : { label: "Knockout punch", detail: `${fmt(ko * MM_PER_IN, 1, 1)} mm`, value: `${fmt(ko, 3, 3)}"`, copy: plain(ko, 3) },
      ],
      highlight: String(c.metric),
      formula: ["Trade sizes and metric designators pair one-to-one in the CEC and NEC tables.", "Knockout punch sizes: American Fittings / Greenlee published punch diameters."],
    };
  },
  table: () => ({
    summary: "All trade sizes",
    columns: ["Inch", "Metric", "Knockout punch"],
    rows: CONDUIT_TRADE_SIZES.map((c) => {
      const ko = KNOCKOUT_PUNCH_IN[c.inch];
      return {
        key: String(c.metric),
        cells: [`${c.inch}"`, String(c.metric), ko === undefined ? "—" : `${fmt(ko, 3, 3)}" · ${fmt(ko * MM_PER_IN, 1, 1)} mm`],
      };
    }),
  }),
};
