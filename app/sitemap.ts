import type { MetadataRoute } from "next";
import { getAllCategories, getAllProductSlugs } from "@/lib/catalogue";
import { siteUrl } from "@/lib/payments/config";
import { LOCALES } from "@/lib/i18n/config";

/**
 * Plan de site, découpé.
 *
 * Chaque page y figure une fois par langue, et chaque entrée déclare ses
 * équivalents dans l'autre langue : sans ce lien, Google traite la version
 * française et l'anglaise comme deux pages concurrentes sur le même sujet,
 * et n'en retient qu'une.
 *
 * Les fiches produit font tout le volume, et c'est voulu : une recherche de
 * pièce se fait sur une référence — « INJ-2201 », « 6N7203 » — et c'est la
 * fiche qui doit répondre, pas la page d'accueil.
 *
 * D'où le découpage. Les neuf mille fiches en deux langues donnaient un seul
 * fichier de onze mégaoctets, au-delà de ce qu'une fonction Vercel peut
 * renvoyer : le plan de site aurait échoué en production après avoir
 * parfaitement fonctionné en local. Google accepte jusqu'à cinquante mille
 * URL par fichier, mais rien n'oblige à s'en approcher.
 */

/** Produits par tranche : 2 000 fiches, soit 4 000 URL, environ 2,5 Mo. */
const CHUNK = 2000;

export async function generateSitemaps() {
  const products = await getAllProductSlugs();
  const chunks = Math.max(1, Math.ceil(products.length / CHUNK));
  // La tranche 0 porte la vitrine et les rayons ; les suivantes, les fiches.
  return Array.from({ length: chunks + 1 }, (_, id) => ({ id }));
}

/** Une entrée par langue, chacune pointant vers l'autre. */
function entries(
  base: string,
  path: string,
  options: {
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    lastModified?: string | Date;
  },
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [locale, `${base}/${locale}${path}`]),
  );

  return LOCALES.map((locale) => ({
    url: `${base}/${locale}${path}`,
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: { languages },
  }));
}

export default async function sitemap(props: {
  // Next 16 passe le numéro de tranche sous forme de promesse. Lu sans
  // `await`, il valait « [object Promise] », et le découpage rendait une
  // tranche vide — servie avec un code 200, sans rien signaler. `await`
  // accepte aussi bien un nombre nu, selon les versions.
  id: number | Promise<number>;
}): Promise<MetadataRoute.Sitemap> {
  const shard = Number(await props.id);
  const base = siteUrl();

  if (!Number.isFinite(shard)) {
    throw new Error(`Plan de site : tranche illisible (${String(shard)})`);
  }

  if (shard === 0) {
    const categories = await getAllCategories();
    return [
      ...entries(base, "", { priority: 1, changeFrequency: "weekly" }),
      ...entries(base, "/catalogue", { priority: 0.9, changeFrequency: "weekly" }),
      ...entries(base, "/marques", { priority: 0.7, changeFrequency: "monthly" }),
      ...entries(base, "/a-propos", { priority: 0.5, changeFrequency: "yearly" }),
      ...entries(base, "/contact", { priority: 0.6, changeFrequency: "yearly" }),
      ...entries(base, "/suivi", { priority: 0.4, changeFrequency: "yearly" }),
      ...categories.flatMap((category) =>
        entries(base, `/catalogue/${category.slug}`, {
          priority: 0.8,
          changeFrequency: "weekly",
          lastModified: category.created_at,
        }),
      ),
    ];
  }

  const products = await getAllProductSlugs();
  const start = (shard - 1) * CHUNK;

  return products.slice(start, start + CHUNK).flatMap((product) =>
    entries(base, `/produits/${product.slug}`, {
      priority: 0.7,
      changeFrequency: "monthly",
      lastModified: product.created_at,
    }),
  );
}
