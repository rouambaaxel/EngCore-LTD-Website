/**
 * Convertit l'export JSON du catalogue partenaire FridayParts en module
 * TypeScript (lib/catalogue-fridayparts.generated.ts).
 *
 * Usage : node scripts/import-fridayparts.mjs <export.json>
 *
 * Les prix ne sont pas repris : le chiffrage passe par la demande de devis.
 * Les visuels pointent vers le CDN du partenaire (600 Mo si copiés localement).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyFridayPartsProduct } from "./taxonomy.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = process.argv[2];
if (!dataPath) throw new Error("Usage: node scripts/import-fridayparts.mjs <export.json>");

const products = JSON.parse(readFileSync(dataPath, "utf8"));

/**
 * Les visuels du partenaire portent un filigrane « FridayParts® » incrusté au
 * centre de la photo. L'effacer serait une suppression d'information de gestion
 * des droits (CDPA s.296ZG au Royaume-Uni), et l'afficher revient à marquer
 * notre catalogue au nom d'un tiers. On n'importe donc pas les images : seules
 * les références et caractéristiques sont reprises.
 *
 * Dès que le partenaire fournit des visuels non filigranés, il suffit de
 * remplir `image_url` ici — le reste du site est déjà prêt.
 */
const PARTNER_IMAGES_ARE_WATERMARKED = true;

function cleanImageUrl(url) {
  if (PARTNER_IMAGES_ARE_WATERMARKED || !url) return null;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("store");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Construit la fiche technique à partir des attributs exploitables :
 * compatibilité moteur, type d'équipement, disponibilité.
 */
function buildSpecs(product) {
  const specs = {};

  const engines = product.engine_brand_data ?? [];
  if (engines.length > 0) {
    specs["Compatibilité moteur"] = engines
      .map((e) => String(e).replace(/^For\s+/i, ""))
      .join(", ");
  }

  const equipment = product.equipment_type_data ?? [];
  if (equipment.length > 0) {
    specs["Type d'équipement"] = equipment.join(", ");
  }

  const brands = product.brand_data ?? [];
  if (brands.length > 0) {
    specs["Marque machine"] = brands.join(", ");
  }

  if (product.stock_status) {
    specs.Disponibilité = product.stock_status === "IN_STOCK" ? "En stock" : "Sur commande";
  }

  return specs;
}

/**
 * Le partenaire préfixe ses marques par « For » (« For KOMATSU »), utile chez
 * lui mais parasite dans une facette. On normalise en majuscules d'origine.
 */
const stripForPrefix = (value) => String(value).replace(/^for\s+/i, "").trim();

/** Marque affichée : la marque moteur est le repère le plus utile ici. */
function pickBrand(product) {
  const engine = (product.engine_brand_data ?? [])[0];
  if (engine) return stripForPrefix(engine);
  const brand = (product.brand_data ?? [])[0];
  if (brand) return stripForPrefix(brand);
  return "";
}

const seenSlugs = new Set();
const entries = [];

for (const product of products) {
  if (!product?.sku || !product?.name) continue;

  let slug = product.url_key || product.sku.toLowerCase();
  slug = String(slug).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  if (seenSlugs.has(slug)) slug = `${slug}-${product.id}`;
  seenSlugs.add(slug);

  const crumbs = (product.categories_breadcrumb ?? []).map((c) => c.name).filter(Boolean);

  entries.push({
    reference: String(product.sku),
    name: String(product.name),
    slug,
    // Pas de description libre dans l'export : on restitue le rayon d'origine.
    description: crumbs.join(" › "),
    brand: pickBrand(product),
    specs: buildSpecs(product),
    image_url: cleanImageUrl(product.thumbnail?.url),
    category_slug: classifyFridayPartsProduct(product),
  });
}

const header = `/**
 * ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
 *
 * Généré par scripts/import-fridayparts.mjs à partir de l'export du catalogue
 * de notre partenaire FridayParts. Les prix ne sont pas repris : ils restent
 * gérés au devis. Les visuels sont servis depuis le CDN du partenaire.
 *
 * ${entries.length} références.
 */

import type { CatalogueProduct } from "@/lib/catalogue-data";

export const FRIDAYPARTS_PRODUCTS: CatalogueProduct[] = `;

writeFileSync(
  join(projectRoot, "lib", "catalogue-fridayparts.generated.ts"),
  `${header}${JSON.stringify(entries, null, 2)};\n`,
  "utf8",
);

const byCategory = {};
for (const entry of entries) {
  byCategory[entry.category_slug] = (byCategory[entry.category_slug] ?? 0) + 1;
}
const withImage = entries.filter((e) => e.image_url).length;
const withSpecs = entries.filter((e) => Object.keys(e.specs).length > 0).length;

console.log(`${entries.length} produits générés.`);
console.log(`Avec visuel : ${withImage} | avec fiche technique : ${withSpecs}`);
console.log("Répartition :");
for (const [slug, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(5)} ${slug}`);
}
