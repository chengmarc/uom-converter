// Simple 24×24 line icons, drawn for this page. Stroke uses currentColor so they take the text
// colour of wherever they sit.

const PATHS: Record<string, string> = {
  // Audiences
  all: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  supplier: "M3 21V11l5 3v-3l5 3v-3l5 3V5h3v16z M7 17h2 M12 17h2 M17 17h1",
  distributor: "M2 6h12v10H2z M14 9h4l3 4v3h-7z M6.5 19.5a1.5 1.5 0 1 0 0-.01 M17.5 19.5a1.5 1.5 0 1 0 0-.01",
  counter: "M3 9l2-5h14l2 5z M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3 M5 12v8h14v-8 M10 20v-4h4v4",
  electrician: "M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4",
  engineer: "M4 20V4l16 16z M8 16h4.5L8 11.5z",
  pim: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  // Topics
  Pricing: "M3 12V3h9l9 9-9 9z M7.5 7.5a1 1 0 1 0 0-.01",
  "Wire & conduit": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  Electrical: "M13 2L4 14h7l-1 8 9-12h-7z",
  Units: "M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2",
  "Product data": "M4 5v14 M7 5v14 M11 5v14 M14 5v14 M18 5v14 M20 5v14",
};

export function icon(name: string): SVGSVGElement | undefined {
  const d = PATHS[name];
  if (!d) return undefined;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.append(path);
  return svg;
}
