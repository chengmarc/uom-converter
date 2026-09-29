import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// main.cjs can't be imported outside Electron, so read both files as text.
const main = readFileSync(new URL("./main.cjs", import.meta.url), "utf8");
const css = readFileSync(new URL("../web/style.css", import.meta.url), "utf8");

const frame = (mode: "light" | "dark") => {
  const m = new RegExp(`${mode}: \\{ chrome: "(#[0-9a-f]{6})", text: "(#[0-9a-f]{6})" \\}`).exec(main);
  if (!m) throw new Error(`No ${mode} FRAME entry in main.cjs`);
  return { chrome: m[1], text: m[2] };
};

// The light tokens are the first :root block; the dark ones sit inside prefers-color-scheme: dark.
const [light, dark] = css.split("@media (prefers-color-scheme: dark)");
const token = (block: string, name: string) => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(block)?.[1];

describe("desktop frame colours", () => {
  it("match the page's --chrome and --text", () => {
    expect(frame("light")).toEqual({ chrome: token(light, "chrome"), text: token(light, "text") });
    expect(frame("dark")).toEqual({ chrome: token(dark, "chrome"), text: token(dark, "text") });
  });
});
