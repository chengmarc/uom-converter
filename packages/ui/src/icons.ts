// Simple 24×24 line icons, drawn for these apps. Stroke uses currentColor so they take the text
// colour of wherever they sit.

import type { AudienceId } from "./audiences";
import type { Topic } from "@uom/converters/model";

// Typed like topics, so a new audience can't ship without an icon.
const AUDIENCES: Record<AudienceId, string> = {
  all: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  supplier: "M3 21V11l5 3v-3l5 3v-3l5 3V5h3v16z M7 17h2 M12 17h2 M17 17h1",
  distributor: "M2 6h12v10H2z M14 9h4l3 4v3h-7z M6.5 19.5a1.5 1.5 0 1 0 0-.01 M17.5 19.5a1.5 1.5 0 1 0 0-.01",
  counter: "M3 9l2-5h14l2 5z M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3 M5 12v8h14v-8 M10 20v-4h4v4",
  estimator: "M6 3h12v18H6z M9 7h6v3H9z M9 14h.01 M12 14h.01 M15 14h.01 M9 17.5h.01 M12 17.5h.01 M15 17.5h.01",
  electrician: "M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4",
  inspector: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.2 15.2L20 20 M7.8 10.5l2 2 3.4-3.4",
  engineer: "M4 20V4l16 16z M8 16h4.5L8 11.5z",
  pim: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
};

// Sidebar topics: typed, so a new topic can't ship without an icon.
const TOPICS: Record<Topic, string> = {
  "Power & loads": "M13 2L4 14h7l-1 8 9-12h-7z",
  "Wire & conduit": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  Equipment: "M9.2 5.2L9.9 2.2L14.1 2.2L14.8 5.2L14.8 5.2L17.4 3.6L20.4 6.6L18.8 9.2L18.8 9.2L21.8 9.9L21.8 14.1L18.8 14.8L18.8 14.8L20.4 17.4L17.4 20.4L14.8 18.8L14.8 18.8L14.1 21.8L9.9 21.8L9.2 18.8L9.2 18.8L6.6 20.4L3.6 17.4L5.2 14.8L5.2 14.8L2.2 14.1L2.2 9.9L5.2 9.2L5.2 9.2L3.6 6.6L6.6 3.6L9.2 5.2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  "Lighting, EV & solar": "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z",
  "Pricing & ordering": "M3 12V3h9l9 9-9 9z M7.5 7.5a1 1 0 1 0 0-.01",
  Units: "M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2",
  "Product data": "M4 5v14 M7 5v14 M11 5v14 M14 5v14 M18 5v14 M20 5v14",
};

/** An audience's or topic's icon. */
export function icon(name: string): SVGSVGElement | undefined {
  const d = AUDIENCES[name as AudienceId] ?? TOPICS[name as Topic];
  return d ? lineIcon(d) : undefined;
}

/** The settings button's icon, in the apps with settings. */
export const settingsIcon = () => lineIcon("M4 7h10 M18 7h2 M4 17h4 M12 17h8 M16 5v4 M10 15v4");

/** A 24×24 line icon from its path, for an app's own controls drawn the same way. */
export function lineIcon(d: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.append(path);
  return svg;
}
