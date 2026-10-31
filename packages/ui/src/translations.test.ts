import { UOM_CODES } from "@uom/core/uom";
import { TOOLS } from "@uom/converters";
import { setNumberStyle } from "@uom/converters/format";
import { dyn, exampleValues, type Output, type Values } from "@uom/converters/model";
import { REGIONS } from "@uom/converters/regions";
import { HELD_LANGUAGES, LANGUAGES, setCatalogue, t } from "@uom/i18n";
import { CATALOGUES } from "@uom/i18n/catalogues";
import ja from "@uom/i18n/ja";
import zh from "@uom/i18n/zh";
import { messages, neutral } from "@uom/i18n/scan";
import { afterEach, describe, expect, it } from "vitest";

/** The held languages too: they stay complete, ready to offer. */
const translations: Record<string, Record<string, string>> = { ...CATALOGUES, zh, ja };
const others = [...LANGUAGES, ...HELD_LANGUAGES].map((l) => l.id).filter((id) => id !== "en");

/** Every string the apps show, including the ones built from data rather than written in code. */
function allMessages() {
  const all = messages();
  for (const u of UOM_CODES) {
    all.add(u.name);
    all.add(u.category);
    if (u.note) all.add(u.note);
  }
  for (const c of TOOLS) {
    const table = c.table?.();
    if (table && !table.summary.startsWith("All ")) all.add(table.summary);
  }
  return new Set([...all].filter((s) => !neutral(s)));
}

const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g))].sort();

/** Everything a converter's result shows, as the apps draw it. */
function resultText(out: Output): string[] {
  if (!out) return [];
  if ("error" in out) return [out.error];
  const v = out.visual;
  return [
    out.heading,
    ...out.rows.flatMap((r) => [r.label, r.detail ?? "", r.group ?? "", r.value]),
    ...(out.formula ?? []),
    ...(v?.kind === "gauge" ? v.marks.map((m) => m.label) : []),
    ...(v?.kind === "cross-sections" ? v.items.map((i) => i.sub) : []),
    ...(v?.kind === "packs" ? [v.label] : []),
  ].map((s) => t(s));
}

describe("translations", () => {
  afterEach(() => setCatalogue({}));

  it.each(others)("%s has every string, and nothing left over", (language) => {
    const all = allMessages();
    const catalogue = translations[language];
    expect([...all].filter((s) => !(s in catalogue))).toEqual([]);
    expect(Object.keys(catalogue).filter((s) => !all.has(s))).toEqual([]);
  });

  it.each(others)("%s keeps every placeholder", (language) => {
    for (const [english, translated] of Object.entries(translations[language])) {
      expect(placeholders(translated), english).toEqual(placeholders(english));
    }
  });

  // A word that gets through untranslated means text built without t(): the leak the two tests
  // above can't see. Chinese makes it obvious, since no word in a translation is in Latin letters.
  it("shows no English in any converter's result, in any region", () => {
    setCatalogue(zh);
    const names = /\b(kcmil|kvar|arccos|GTIN|ASTM|ANSI|SSCC|THHN|THWN|XHHW|kAIC|Greenlee|American|Fittings|BMEcat|ETIM|Peppol|Excel)\b/g;
    const leaks = new Set<string>();
    for (const region of REGIONS) {
      setNumberStyle(region.number);
      for (const conv of TOOLS) {
        const blank = { region: region.id } as Values;
        const shown = [conv.title, dyn(conv.blurb, blank), conv.empty, conv.note ? dyn(conv.note, blank) : "", conv.topic];
        for (const ex of dyn(conv.examples, blank)) {
          const v = exampleValues(conv, ex.set, region.id);
          shown.push(ex.label, ...resultText(conv.compute(v)));
          for (const f of conv.fields) {
            shown.push(dyn(f.label, v));
            if (f.kind === "choice") shown.push(...f.options.map((o) => o.label));
            else shown.push(f.suffix ? dyn(f.suffix, v) : "", f.placeholder ? dyn(f.placeholder, v) : "");
          }
        }
        const table = conv.table?.();
        if (table) shown.push(table.summary, ...table.columns, ...table.rows.flatMap((r) => ("group" in r ? [r.group] : [])));
        for (const s of shown.map((s) => t(s))) if (/[A-Za-z]{4,}/.test(s.replace(names, ""))) leaks.add(`${conv.id}: ${s}`);
      }
    }
    expect([...leaks]).toEqual([]);
  });
});
