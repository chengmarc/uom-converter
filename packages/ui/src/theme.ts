// The light or dark choice in the apps' settings: the system's, unless someone picks one (storage.ts).
// The Windows app hands it to Electron, which changes the page and the window frame together. The
// Android app has no such switch, since its web view always reports the phone's setting, so it
// uses pageTheme() below. The website has no choice to make: it always follows the system.

import { store, stored } from "./storage";

export type Theme = "system" | "light" | "dark";

/** The choices settings offer, in order. */
export const THEMES: { id: Theme; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** The theme to open in: the one chosen last, else the system's. */
export const chosenTheme = (): Theme => THEMES.find((x) => x.id === stored("uom.theme"))?.id ?? "system";

export const chooseTheme = (theme: Theme) => store("uom.theme", theme);

const DARK_QUERY = "(prefers-color-scheme: dark)";
/** Always and never true, and unlike `all` they can sit inside a longer query. */
const ALWAYS = "(min-width: 0)";
const NEVER = "(max-width: 0)";

/** A media query as a theme should read it: the dark condition settled, or left to the system. */
export const themedQuery = (query: string, theme: Theme) =>
  theme === "system" ? query : query.replaceAll(DARK_QUERY, theme === "dark" ? ALWAYS : NEVER);

const originals = new WeakMap<CSSMediaRule, string>();

/**
 * Applies a theme to the page by settling its dark-mode media rules in place, so the styles stay
 * written once. Call it again to change theme: each rule remembers what it first said.
 */
export function pageTheme(theme: Theme) {
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (!(rule instanceof CSSMediaRule)) continue;
      const original = originals.get(rule) ?? rule.media.mediaText;
      if (!original.includes(DARK_QUERY)) continue;
      originals.set(rule, original);
      rule.media.mediaText = themedQuery(original, theme);
    }
  }
}
