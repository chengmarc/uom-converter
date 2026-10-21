import { readFileSync } from "node:fs";
import { token } from "@uom/brand/tokens";
import { describe, expect, it } from "vitest";

// main.cjs can't be imported outside Electron, so read it as text.
const main = readFileSync(new URL("./main.cjs", import.meta.url), "utf8");

const frame = (mode: "light" | "dark") => {
  const m = new RegExp(`${mode}: \\{ chrome: "(#[0-9a-f]{6})", text: "(#[0-9a-f]{6})" \\}`).exec(main);
  if (!m) throw new Error(`No ${mode} FRAME entry in main.cjs`);
  return { chrome: m[1], text: m[2] };
};

describe("desktop frame colours", () => {
  it("match the page's --sunken and --text", () => {
    expect(frame("light")).toEqual({ chrome: token("sunken", "light"), text: token("text", "light") });
    expect(frame("dark")).toEqual({ chrome: token("sunken", "dark"), text: token("text", "dark") });
  });
});
