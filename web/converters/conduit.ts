import { CONDUIT_TRADE_SIZES, conduitSize, KNOCKOUT_PUNCH_IN } from "../../src/conduit";
import { MM_PER_IN } from "../../src/units";
import { fmt, plain } from "../format";
import type { Converter, Example, Row } from "../ui";

export const conduit: Converter = {
  id: "conduit",
  topic: "Wire & conduit",
  title: "Conduit & knockouts",
  blurb: (v) =>
    v.region === "eu"
      ? "North American inch trade size ↔ metric designator, with the typical knockout punch diameter."
      : "Inch trade size ↔ metric designator (CEC / NEC), with the typical knockout punch diameter.",
  empty: 'Enter a trade size in either system: 1-1/4", 1.25, 35 or M35.',
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
    const c = conduitSize(raw);
    if ("error" in c) return { error: c.error + ".", fields: ["size"] };
    const ko = KNOCKOUT_PUNCH_IN[c.inch];
    // Answer in the system the user didn't type.
    const typedMetric = c.typed === "metric";
    const inchRow: Row = { label: "Inch trade size", value: `${c.inch}"`, copy: c.inch };
    const metricRow: Row = { label: "Metric designator", value: String(c.metric) };
    return {
      heading: typedMetric ? `Metric designator ${c.metric}` : `Trade size ${c.inch}"`,
      rows: [
        ...(typedMetric ? [inchRow, metricRow] : [metricRow, inchRow]),
        ko === undefined
          ? { label: "Knockout punch", value: "Not listed", copy: "", status: "warn" }
          : { label: "Knockout punch", detail: `${fmt(ko * MM_PER_IN, 1, 1)} mm`, value: `${fmt(ko, 3, 3)}"`, copy: plain(ko, 3) },
      ],
      formula: ["Trade sizes and metric designators pair one-to-one in the CEC and NEC tables.", "Knockout punch sizes: American Fittings / Greenlee published punch diameters."],
    };
  },
  extra() {
    const details = document.createElement("details");
    details.className = "table-wrap";
    details.innerHTML = `<summary>All trade sizes</summary><table><thead><tr><th scope="col">Inch</th><th scope="col">Metric</th><th scope="col">Knockout punch</th></tr></thead><tbody></tbody></table>`;
    details.querySelector("tbody")!.append(
      ...CONDUIT_TRADE_SIZES.map((c) => {
        const tr = document.createElement("tr");
        tr.dataset.metric = String(c.metric);
        const ko = KNOCKOUT_PUNCH_IN[c.inch];
        for (const text of [`${c.inch}"`, String(c.metric), ko === undefined ? "—" : `${fmt(ko, 3, 3)}" · ${fmt(ko * MM_PER_IN, 1, 1)} mm`]) {
          tr.append(Object.assign(document.createElement("td"), { textContent: text }));
        }
        return tr;
      }),
    );
    return details;
  },
  after(out, panel) {
    const metric = out && "rows" in out ? out.rows.find((r) => r.label === "Metric designator")?.value : undefined;
    panel.querySelectorAll<HTMLElement>("tbody tr").forEach((tr) => tr.classList.toggle("hit", tr.dataset.metric === metric));
  },
};
