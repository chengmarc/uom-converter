import { HELD_LANGUAGES, LANGUAGES } from "@uom/i18n";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { TEXT } = createRequire(import.meta.url)("./menus.cjs");

describe("native menus", () => {
  it("has every label in every language", () => {
    for (const { id } of [...LANGUAGES, ...HELD_LANGUAGES]) {
      expect(Object.keys(TEXT[id]), id).toEqual(Object.keys(TEXT.en));
    }
  });
});
