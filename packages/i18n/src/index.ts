// Text in the reader's language. The English in the source is the key, so code reads as it always
// did and a string with no translation falls back to English. An app that offers other languages
// loads a catalogue (catalogues.ts); one that doesn't, like the website, stays in English and
// carries no translations.

export const LANGUAGES = [
  { id: "en", name: "English", tag: "en" },
  { id: "es", name: "Español", tag: "es" },
  { id: "de", name: "Deutsch", tag: "de" },
  { id: "fr", name: "Français", tag: "fr" },
] as const;

/**
 * Translated and kept up to date, but not offered: the apps don't list them, follow a system set to
 * them, or ship them. They wait for regions of their own: with only the US, Canada and Europe to
 * choose from, readers in China and Japan would get the wrong voltages and wiring codes.
 */
export const HELD_LANGUAGES = [
  { id: "zh", name: "简体中文", tag: "zh-Hans" },
  { id: "ja", name: "日本語", tag: "ja" },
] as const;

export type Language = (typeof LANGUAGES)[number]["id"];

/** English text → its translation. */
export type Catalogue = Record<string, string>;

let catalogue: Catalogue = {};

export function setCatalogue(c: Catalogue) {
  catalogue = c;
}

/**
 * `text` in the current language, with its {placeholders} filled in from `params`. Numbers go in
 * as params, already formatted, so a translation can put them where its language wants them.
 */
export function t(text: string, params?: Record<string, string | number>): string {
  const s = catalogue[text] ?? text;
  return params ? s.replace(/\{(\w+)\}/g, (m, key: string) => (key in params ? String(params[key]) : m)) : s;
}
