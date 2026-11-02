import { readFileSync } from "node:fs";
import { LANGUAGES } from "@uom/i18n";
import { describe, expect, it } from "vitest";

// electron-builder's config needs Electron to load, so read it as text.
const config = readFileSync(new URL("../../../../apps/windows/packaging/electron-builder.config.cjs", import.meta.url), "utf8");

/** The language ids in one of the config's lists: "es_ES" and "es-ES" are both es. */
function listed(key: string) {
  const list = new RegExp(`\\b${key}: \\[([^\\]]*)\\]`).exec(config);
  if (!list) throw new Error(`No ${key} in electron-builder.config.cjs`);
  return [...list[1].matchAll(/"([a-z]+)[-_][A-Z]+"/g)].map((m) => m[1]);
}

describe("packaged languages", () => {
  it("are the languages the app offers", () => {
    const offered = LANGUAGES.map((l) => l.id);
    expect(listed("installerLanguages")).toEqual(offered);
    expect(listed("languages")).toEqual(offered);
  });
});
