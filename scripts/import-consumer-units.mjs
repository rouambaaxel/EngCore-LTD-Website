/**
 * Convertit l'export JSON des « Consumer Units » en module TypeScript
 * (lib/catalogue-consumer-units.generated.ts).
 *
 * Usage : node scripts/import-consumer-units.mjs <export.json> <imagesManifest.json>
 *
 * Les prix ne sont pas repris. Les visuels pointent vers /images/products/,
 * téléchargés au préalable.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyProduct } from "./taxonomy.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = process.argv[2];
const manifestPath = process.argv[3];
if (!dataPath || !manifestPath) {
  throw new Error("Usage: node scripts/import-consumer-units.mjs <export.json> <manifest.json>");
}

const products = JSON.parse(readFileSync(dataPath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")); // url -> fichier

/** Décode les entités HTML courantes. */
function decodeEntities(text) {
  const named = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    hellip: "…", ndash: "–", mdash: "—", deg: "°", times: "×",
    laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à",
    ccedil: "ç", ocirc: "ô", ldquo: "“", rdquo: "”",
    lsquo: "‘", rsquo: "’", trade: "™", reg: "®", copy: "©",
  };
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m);
}

const stripTags = (html) => decodeEntities(html.replace(/<[^>]*>/g, " "))
  .replace(/\s+/g, " ")
  .trim();

/** Extrait les paragraphes en texte brut. */
function extractParagraphs(html) {
  const out = [];
  for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripTags(m[1]);
    if (text) out.push(text);
  }
  return out;
}

/** Extrait les puces <li>. */
function extractBullets(html) {
  const out = [];
  for (const m of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = stripTags(m[1]);
    if (text) out.push(text);
  }
  return out;
}

/**
 * Transforme les puces en fiche technique. « Rating: 40 Amp » devient une
 * paire libellé/valeur ; les puces sans séparateur deviennent des
 * caractéristiques numérotées.
 */
function bulletsToSpecs(bullets) {
  const specs = {};
  let n = 0;
  for (const bullet of bullets) {
    const match = bullet.match(/^([^:]{2,40}):\s*(.+)$/);
    if (match) {
      const label = match[1].trim();
      const value = match[2].trim();
      if (!specs[label]) { specs[label] = value; continue; }
    }
    n += 1;
    specs[`Caractéristique ${n}`] = bullet;
  }
  return specs;
}

const seenSlugs = new Set();
const entries = [];

for (const p of products) {
  const html = p.description || p.short_description || "";
  const paragraphs = extractParagraphs(html);
  const bullets = extractBullets(html);

  // Description : les paragraphes si présents, sinon la première puce.
  let description = paragraphs.join(" ");
  if (!description) description = bullets[0] ?? "";
  // On garde une description raisonnable pour l'affichage catalogue.
  if (description.length > 900) description = description.slice(0, 897).trimEnd() + "…";

  const specs = bulletsToSpecs(bullets);

  let slug = p.slug;
  if (seenSlugs.has(slug)) slug = `${slug}-${p.id}`;
  seenSlugs.add(slug);

  const src = p.images[0]?.src;
  const file = src ? manifest[src] : undefined;

  entries.push({
    reference: decodeEntities(p.sku || String(p.id)),
    name: decodeEntities(p.name),
    slug,
    description,
    brand: decodeEntities(p.brands[0] ?? ""),
    specs,
    image_url: file ? `/images/products/${file}` : null,
    category_slug: classifyProduct(p),
  });
}

const header = `/**
 * ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
 *
 * Généré par scripts/import-consumer-units.mjs à partir de l'export du
 * catalogue « Consumer Units » de notre partenaire Express Electrical.
 * Les prix ne sont pas repris : ils restent gérés au devis.
 *
 * ${entries.length} références.
 */

import type { CatalogueProduct } from "@/lib/catalogue-data";

export const CONSUMER_UNIT_PRODUCTS: CatalogueProduct[] = `;

const body = JSON.stringify(entries, null, 2);

writeFileSync(
  join(projectRoot, "lib", "catalogue-consumer-units.generated.ts"),
  `${header}${body};\n`,
  "utf8",
);

const withImage = entries.filter((e) => e.image_url).length;
const withSpecs = entries.filter((e) => Object.keys(e.specs).length > 0).length;
const brands = [...new Set(entries.map((e) => e.brand).filter(Boolean))].sort();
console.log(`${entries.length} produits générés.`);
console.log(`Avec visuel : ${withImage} | avec fiche technique : ${withSpecs}`);
console.log(`Marques : ${brands.join(", ")}`);
