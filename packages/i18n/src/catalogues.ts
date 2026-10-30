// Every language's translations, for the apps that offer them: importing this adds them to the bundle.

import de from "./de";
import es from "./es";
import fr from "./fr";
import type { Catalogue, Language } from "./index";

export const CATALOGUES: Record<Language, Catalogue> = { en: {}, es, de, fr };
