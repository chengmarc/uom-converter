import { readdirSync } from "node:fs";
import { LANGUAGES } from "@uom/i18n";
import { describe, expect, it } from "vitest";
import { field, parseCaptions, reader, shotNames } from "../listing";

const offered = LANGUAGES.map((l) => l.id as string).sort();
// The listing and what it's made from, in the Android app.
const LISTING = new URL("../../../../apps/android/store-listing/", import.meta.url);
const read = reader(LISTING);

type Captions = { region?: string; tagline: string; shots: Record<string, { title: string; text: string }> };
const captions = () => parseCaptions<Captions>(read("./generator/captions.js"));
const shots = () => shotNames(read("./generator/shots.html"));
const listing = (id: string) => read(`./localization/${id}.md`);

/** Words Google asks store assets to avoid, by language. */
const PROMOTIONAL: Record<string, RegExp> = {
  en: /\b(best|free|top|#1|sale|download now|install now)\b/i,
  es: /\b(mejor|gratis|gratuit[oa]|oferta|descarga ahora)\b/i,
  de: /\b(beste[rs]?|kostenlos|gratis|angebot|jetzt laden)\b/i,
  fr: /\b(meilleure?|gratuite?|promo|téléchargez)\b/i,
};

describe("the Google Play listing", () => {
  it("has text and captions for the languages the app offers", () => {
    const files = readdirSync(new URL("./localization/", LISTING)).map((f) => f.replace(".md", ""));
    expect(files.sort()).toEqual(offered);
    expect(Object.keys(captions()).sort()).toEqual(offered);
  });

  it("captions every shot in every language", () => {
    for (const words of Object.values(captions())) {
      expect(Object.keys(words.shots).sort()).toEqual(shots());
      expect(words.tagline).toMatch(/<em>.+<\/em>/);
      for (const shot of Object.values(words.shots)) expect(shot.title).toMatch(/<em>[^<]+<\/em>$/);
    }
  });

  it("is translated", () => {
    const english = captions().en;
    for (const id of offered.filter((id) => id !== "en")) {
      for (const [name, shot] of Object.entries(captions()[id].shots)) {
        expect(shot.title).not.toBe(english.shots[name].title);
        expect(shot.text).not.toBe(english.shots[name].text);
      }
      for (const heading of ["Short description", "Full description", "What's new in this version"]) {
        expect(field(listing(id), heading)).not.toBe(field(listing("en"), heading));
      }
    }
  });

  it.each(offered)("keeps to Play Console's limits in %s", (id) => {
    const text = listing(id);
    expect(field(text, "App name").length).toBeLessThanOrEqual(30);
    expect(field(text, "Short description").length).toBeLessThanOrEqual(80);
    expect(field(text, "Full description").length).toBeLessThanOrEqual(4000);
    expect(field(text, "What's new in this version").length).toBeLessThanOrEqual(500);
  });

  it.each(offered)("has no promotional wording in %s", (id) => {
    const words = captions()[id];
    const seen = [field(listing(id), "Short description"), words.tagline, ...Object.values(words.shots).flatMap((s) => [s.title, s.text])];
    expect(seen.filter((s) => PROMOTIONAL[id].test(s))).toEqual([]);
  });

  it("keeps the app's name in every language", () => {
    for (const id of offered) expect(field(listing(id), "App name")).toBe("UOM Converter");
  });

  it("captures tablets at 9:16, as Google asks", () => {
    const devices = [...read("./generator/render.cjs").matchAll(/tablet\d+: \{ width: (\d+), height: (\d+)/g)];
    expect(devices).toHaveLength(2);
    for (const [, width, height] of devices) expect(Number(width) * 16).toBe(Number(height) * 9);
  });
});
