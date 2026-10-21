import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { plainText, SOURCE, OUT } = createRequire(import.meta.url)("./privacy.cjs");

describe("the Store's privacy policy", () => {
  // Partner Center gets the same policy as the repo's PRIVACY.md, as plain text.
  it("is PRIVACY.md as plain text (run `node apps/windows/store/privacy.cjs` after changing it)", () => {
    expect(readFileSync(OUT, "utf8").replace(/\r\n/g, "\n")).toBe(plainText(readFileSync(SOURCE, "utf8")));
  });
});
