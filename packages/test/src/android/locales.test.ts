import { readFileSync } from "node:fs";
import { LANGUAGES } from "@uom/i18n";
import { describe, expect, it } from "vitest";

// What Android 13+ offers in its system settings. Read as text, as Android does.
const config = readFileSync(new URL("../../../../apps/android/native/app/src/main/res/xml/locales_config.xml", import.meta.url), "utf8");

describe("locales_config.xml", () => {
  it("lists the languages the app offers", () => {
    expect([...config.matchAll(/<locale android:name="([^"]+)"/g)].map((m) => m[1])).toEqual(LANGUAGES.map((l) => l.id));
  });
});
