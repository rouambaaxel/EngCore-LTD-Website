/**
 * Formats dépendant de la langue.
 *
 * Ils vivent à part des dictionnaires : ceux-ci doivent rester des données
 * pures, sérialisables telles quelles vers les composants client. Une fonction
 * dans un dictionnaire empêcherait de passer `t` au-delà de la frontière
 * serveur/client.
 */

import type { Locale } from "./config";

export function formatReferences(n: number, locale: Locale): string {
  return locale === "en"
    ? `${n} product${n > 1 ? "s" : ""}`
    : `${n} référence${n > 1 ? "s" : ""}`;
}

export function formatResults(n: number, locale: Locale): string {
  return locale === "en"
    ? `${n} result${n > 1 ? "s" : ""}`
    : `${n} résultat${n > 1 ? "s" : ""}`;
}

export function formatRange(from: number, to: number, locale: Locale): string {
  return locale === "en" ? `(showing ${from}–${to})` : `(affichage ${from}–${to})`;
}

export function formatBrandFilter(brand: string, locale: Locale): string {
  return locale === "en" ? ` · brand ${brand}` : ` · marque ${brand}`;
}

export function formatCancelledOn(date: string, locale: Locale): string {
  return locale === "en" ? `Order cancelled on ${date}.` : `Commande annulée le ${date}.`;
}
