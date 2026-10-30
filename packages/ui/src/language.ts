// The language an app is shown in: the one chosen last (storage.ts), else the system's first that
// we have, else English. It's separate from the region: someone in Canada can read French with
// Canadian voltages and number formats. Only the apps that offer languages import this, so the
// website carries no translations.

import { LANGUAGES, setCatalogue, t, type Language } from "@uom/i18n";
import { CATALOGUES } from "@uom/i18n/catalogues";
import { store, stored } from "./storage";

const known = (id: string | null | undefined) => LANGUAGES.find((l) => l.id === id)?.id;

function guessLanguage(): Language {
  for (const tag of navigator.languages) {
    const id = known(tag.split("-")[0].toLowerCase());
    if (id) return id;
  }
  return "en";
}

function apply(language: Language) {
  setCatalogue(CATALOGUES[language]);
  // Also picks the right Chinese or Japanese letterforms from the system's fonts.
  document.documentElement.lang = LANGUAGES.find((l) => l.id === language)!.tag;
  translatePage();
}

/** The language to open in (the address's ?lang=, else the one chosen last, else a guess), applied. Call it before anything is drawn. */
export function chosenLanguage(params?: URLSearchParams): Language {
  const language = known(params?.get("lang") ?? stored("uom.language")) ?? guessLanguage();
  apply(language);
  return language;
}

/** Remembers the language and applies it; the app then redraws what it drew itself. */
export function chooseLanguage(language: Language) {
  store("uom.language", language);
  apply(language);
}

/**
 * The page's own HTML, marked up for this: data-t on an element whose text is the English,
 * data-t-placeholder, data-t-aria-label and data-t-title for those attributes, with the English as their value.
 */
function translatePage() {
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => {
    e.dataset.t ||= e.textContent!;
    e.textContent = t(e.dataset.t);
  });
  for (const attr of ["placeholder", "aria-label", "title"]) {
    document.querySelectorAll(`[data-t-${attr}]`).forEach((e) => e.setAttribute(attr, t(e.getAttribute(`data-t-${attr}`)!)));
  }
}
