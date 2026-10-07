import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/payments/config";
import { getAllProductSlugs } from "@/lib/catalogue";

/** Doit correspondre au découpage de `app/sitemap.ts`. */
const CHUNK = 2000;

/**
 * Ce qu'un moteur de recherche peut parcourir.
 *
 * La vitrine est ouverte : c'est elle qui doit remonter sur une référence de
 * pièce. Tout ce qui demande un compte est fermé — non par secret, les
 * politiques de la base y veillent déjà, mais parce qu'un robot n'y verrait
 * qu'un écran de connexion. Indexer mille pages identiques dilue les pages
 * qui comptent.
 *
 * `/suivi` reste ouvert : la page est utile, et son contenu ne s'obtient
 * qu'avec un numéro de commande, que le robot n'a pas.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteUrl();

  // Le plan de site est découpé en tranches, qu'il faut toutes déclarer :
  // Next ne publie pas d'index les regroupant, et une tranche non citée ne
  // serait jamais lue.
  const products = await getAllProductSlugs();
  const chunks = Math.max(1, Math.ceil(products.length / CHUNK));
  const sitemaps = Array.from(
    { length: chunks + 1 },
    (_, id) => `${base}/sitemap/${id}.xml`,
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/fr/admin",
          "/en/admin",
          "/fr/compte",
          "/en/compte",
          "/fr/connexion",
          "/en/connexion",
          "/fr/inscription",
          "/en/inscription",
          "/fr/mot-de-passe",
          "/en/mot-de-passe",
          // Le panier est propre à chaque visiteur : rien à indexer.
          "/fr/panier",
          "/en/panier",
          // Résultats de recherche : autant de pages que de requêtes
          // imaginables, et aucune qui mérite d'être trouvée telle quelle.
          "/fr/recherche",
          "/en/recherche",
        ],
      },
    ],
    sitemap: sitemaps,
    host: base,
  };
}
