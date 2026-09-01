import { fr, type Dictionary } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };

/** Libellés de la langue demandée ; repli sur la langue par défaut. */
export function getDictionary(locale: string): Dictionary {
  return DICTIONARIES[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/** Préfixe un chemin interne par la langue courante. */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

export type { Dictionary };
export * from "./config";
