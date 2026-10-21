import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// What shows before the page does: the splash (launch.xml, light and night) and the web view
// behind it (capacitor.config.ts). Read as text, as Android and Capacitor do.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const splash = (folder: string) =>
  /<color name="launch_background">(#[0-9A-Fa-f]{6})<\/color>/.exec(read(`../native/app/src/main/res/${folder}/launch.xml`))?.[1]?.toLowerCase();
const webView = /backgroundColor: "(#[0-9a-f]{6})"/.exec(read("../capacitor.config.ts"))?.[1];

// The light tokens are the first :root block; the dark ones sit inside prefers-color-scheme: dark.
const [light, dark] = read("../../../packages/brand/tokens.css").split("@media (prefers-color-scheme: dark)");
const bg = (block: string) => /--bg: (#[0-9a-f]{6});/.exec(block)?.[1];

describe("launch colours", () => {
  it("match the page's --bg", () => {
    expect(splash("values")).toBe(bg(light));
    expect(splash("values-night")).toBe(bg(dark));
    expect(webView).toBe(bg(light));
  });
});
