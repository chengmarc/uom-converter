import { readdirSync, readFileSync } from "node:fs";
import { LANGUAGES } from "@uom/i18n";
import { describe, expect, it } from "vitest";

const offered = LANGUAGES.map((l) => l.id as string).sort();
// The listing and what it's made from, in the Windows app.
const LISTING = new URL("../../../../apps/windows/store-listing/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, LISTING), "utf8").replaceAll("\r\n", "\n");

type Captions = { region?: string; tagline: string; facts: string[]; shots: Record<string, { title: string; text: string }> };

/** captions.js is a page's script, so read it as text; what's inside the braces is JSON. */
function captions(): Record<string, Captions> {
  const text = read("./generator/captions.js");
  return JSON.parse(text.slice(text.indexOf("= {") + 2, text.lastIndexOf("}") + 1));
}

/** The shots shots.html lists, by name. */
function shots() {
  const list = /const SHOTS = \{(.*?)\n {6}\};/s.exec(read("./generator/shots.html"))![1];
  return [...list.matchAll(/^\s*"?([\w-]+)"?: \{/gm)].map((m) => m[1]).sort();
}

/** A listing's field: the code block under its heading. */
function field(listing: string, heading: string) {
  const found = new RegExp(`^### ${heading}\\n+\`\`\`\\n(.*?)\\n\`\`\``, "ms").exec(listing);
  if (!found) throw new Error(`No ${heading}`);
  return found[1];
}

const listing = (id: string) => read(`./localization/${id}.md`);

describe("the Store listing", () => {
  it("has text and captions for the languages the app offers", () => {
    const files = readdirSync(new URL("./localization/", LISTING)).map((f) => f.replace(".md", ""));
    expect(files.sort()).toEqual(offered);
    expect(Object.keys(captions()).sort()).toEqual(offered);
  });

  it("captions every shot in every language", () => {
    for (const words of Object.values(captions())) {
      expect(Object.keys(words.shots).sort()).toEqual(shots());
      expect(words.facts).toHaveLength(captions().en.facts.length);
      expect(words.facts[0]).toContain("{count}");
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
      for (const heading of ["Description", "What's new in this version", "Product features", "Short description", "Keywords"]) {
        expect(field(listing(id), heading)).not.toBe(field(listing("en"), heading));
      }
    }
  });

  it.each(offered)("keeps to Partner Center's limits in %s", (id) => {
    const text = listing(id);
    const features = field(text, "Product features").split("\n");
    const keywords = field(text, "Keywords").split("\n");
    expect(field(text, "Description").length).toBeLessThanOrEqual(10_000);
    expect(field(text, "What's new in this version").length).toBeLessThanOrEqual(1500);
    expect(field(text, "Short description").length).toBeLessThanOrEqual(270);
    expect(features.length).toBeLessThanOrEqual(20);
    expect(features.filter((f) => f.length > 200)).toEqual([]);
    expect(keywords.length).toBeLessThanOrEqual(7);
    expect(keywords.filter((k) => k.length > 40)).toEqual([]);
    expect(keywords.flatMap((k) => k.split(/\s+/)).length).toBeLessThanOrEqual(21);
  });

  it("captures the app at the size its window opens at", () => {
    const size = (file: string, name: string) => new RegExp(`const ${name} = \\{ width: (\\d+), height: (\\d+)`).exec(read(file))!.slice(1);
    expect(size("./generator/render.cjs", "APP_SIZE")).toEqual(size("../shell/main.cjs", "MIN_SIZE"));
  });

  it("enters the shared fields the same in every language", () => {
    for (const heading of ["Copyright and trademark info", "Additional license terms", "Developed by"]) {
      for (const id of offered) expect(field(listing(id), heading)).toBe(field(listing("en"), heading));
    }
  });
});
