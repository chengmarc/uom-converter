// tokens.css's colours, read as text, for the places CSS can't reach: the website's theme-color and
// web manifest (apps/web/generate/head.ts and offline.ts), and the tests that check the hand-made copies in the
// Windows app's frame and the Android splash.

import { readFileSync } from "node:fs";

// The light tokens are the first :root block; the dark ones sit inside prefers-color-scheme: dark.
const [light, dark] = readFileSync(new URL("./tokens.css", import.meta.url), "utf8").split("@media (prefers-color-scheme: dark)");

/** A colour token's hex value (`token("bg", "dark")` → "#15181c"), in the light or the dark theme. */
export function token(name: string, mode: "light" | "dark"): string {
  const value = new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(mode === "light" ? light : dark)?.[1];
  if (!value) throw new Error(`tokens.css: no ${mode} --${name} as a hex colour`);
  return value;
}
