/**
 * Donne à chaque sous-catégorie le visuel d'un de ses propres produits.
 *
 * Usage : npm run generate:category-images
 *
 * Sans cela, 56 sous-catégories se partagent 13 photos d'illustration : une
 * même image de tuyauterie servait aussi bien à « Ventilation » qu'à
 * « Raccords & flexibles ». Une photo tirée du rayon lui-même est à la fois
 * exacte et distincte, sans téléchargement supplémentaire.
 *
 * Les familles de premier niveau conservent leurs photos thématiques : elles
 * illustrent un métier, pas une référence.
 *
 * À lancer APRÈS `generate:categories` (qui réécrit le fichier) et après les
 * imports partenaires (qui fournissent les produits).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const categoriesPath = join(projectRoot, "lib", "catalogue-categories.generated.ts");

/** Transpile un module TypeScript et le charge, en résolvant les alias `@/`. */
async function loadTsModule(absPath, seen = new Map()) {
  if (seen.has(absPath)) return seen.get(absPath);

  const { outputText } = ts.transpileModule(readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });

  const specifiers = [...outputText.matchAll(/from\s+["'](@\/[^"']+)["']/g)].map((m) => m[1]);
  let code = outputText;
  for (const specifier of new Set(specifiers)) {
    const url = await loadTsModule(join(projectRoot, `${specifier.slice(2)}.ts`), seen);
    code = code.replaceAll(specifier, url);
  }

  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  seen.set(absPath, dataUrl);
  return dataUrl;
}

const { CATALOGUE_PRODUCTS } = await import(
  await loadTsModule(join(projectRoot, "lib", "catalogue-data.ts"))
);

// Combien de produits partagent chaque visuel : un visuel utilisé une seule
// fois est très probablement une vraie photo produit, pas un substitut.
const imageUsage = new Map();
for (const product of CATALOGUE_PRODUCTS) {
  if (!product.image_url) continue;
  imageUsage.set(product.image_url, (imageUsage.get(product.image_url) ?? 0) + 1);
}

const isPlaceholder = (url) =>
  /IMAGE-COMING-SOON|placeholder|no[-_]?image/i.test(url);

/**
 * Photos d'illustration ajoutées à la main pour les fiches sans visuel
 * fournisseur. Ce sont de vraies photos, mais génériques : on ne s'en sert pour
 * une vignette de rayon que si aucun cliché produit n'est disponible.
 */
const STOCK_IMAGES = [
  "diesel-turbo", "diesel-engine-parts", "diesel-filter", "diesel-injector",
  "industrial-pump", "industrial-valve", "industrial-pipes", "industrial-machine",
  "bearing", "control-electronics", "heat-exchanger",
  "category-diesel", "category-heavy-equipment", "category-electrical", "hero-mining",
];

const isStockPhoto = (url) => STOCK_IMAGES.some((name) => url.includes(name));

/** Visuels candidats, du plus au moins représentatif du rayon. */
function rankImages(products) {
  const candidates = products
    .filter((p) => p.image_url && !isPlaceholder(p.image_url))
    .sort((a, b) => {
      // 1. Un cliché produit prime sur une photo d'illustration générique.
      const stock = Number(isStockPhoto(a.image_url)) - Number(isStockPhoto(b.image_url));
      if (stock !== 0) return stock;
      // 2. Visuel le moins partagé — le plus spécifique au produit.
      const usage = (imageUsage.get(a.image_url) ?? 0) - (imageUsage.get(b.image_url) ?? 0);
      if (usage !== 0) return usage;
      // 2. Nom le plus court : souvent la référence la plus générique du rayon.
      const length = a.name.length - b.name.length;
      if (length !== 0) return length;
      // 3. Départage stable.
      return a.slug.localeCompare(b.slug);
    });

  // Dédoublonné : plusieurs produits partagent parfois le même visuel.
  return [...new Set(candidates.map((p) => p.image_url))];
}

const byCategory = new Map();
for (const product of CATALOGUE_PRODUCTS) {
  const bucket = byCategory.get(product.category_slug) ?? [];
  bucket.push(product);
  byCategory.set(product.category_slug, bucket);
}

// On réécrit uniquement le champ image_url des sous-catégories.
const source = readFileSync(categoriesPath, "utf8");
const start = source.indexOf("= [");
const end = source.lastIndexOf("]") + 1;
const categories = JSON.parse(source.slice(start + 2, end));

/**
 * Produits d'une famille, en commençant par ceux de sa sous-catégorie la plus
 * fournie : une vignette de famille doit évoquer le rayon dominant. Sans cela,
 * « Appareillage électrique » était illustré par un collier de serrage plutôt
 * que par un disjoncteur.
 */
function productGroupsOfFamily(slug) {
  const children = categories
    .filter((c) => c.parent_slug === slug)
    .map((c) => c.slug)
    .sort((a, b) => (byCategory.get(b)?.length ?? 0) - (byCategory.get(a)?.length ?? 0));

  // Un groupe par sous-catégorie : le classement s'applique à l'intérieur de
  // chacun, si bien que le rayon dominant est épuisé avant qu'on regarde les
  // suivants.
  return [...children, slug].map((s) => byCategory.get(s) ?? []).filter((g) => g.length > 0);
}

let assigned = 0;
const untouched = [];
// Une même photo ne doit pas illustrer deux rayons : on note celles déjà prises.
const used = new Set();

/**
 * Choisit un visuel *encore inutilisé* parmi des groupes de produits examinés
 * dans l'ordre. Renvoie `null` si tous sont déjà pris : une carte sans image
 * vaut mieux qu'une image répétée d'un rayon à l'autre.
 */
function pickUnique(groups) {
  const ranked = groups.flatMap((group) => rankImages(group));
  return ranked.find((url) => !used.has(url)) ?? null;
}

/**
 * Photos thématiques réservées aux familles. Elles illustrent un métier, pas
 * une référence : une famille sans cliché produit disponible en reçoit une,
 * distincte à chaque fois.
 */
const FAMILY_FALLBACKS = [
  "/images/category-diesel.jpg",
  "/images/products/control-electronics.jpg",
  "/images/products/diesel-filter.jpg",
  "/images/category-heavy-equipment.jpg",
  "/images/products/industrial-valve.jpg",
  "/images/products/industrial-machine.jpg",
  "/images/products/industrial-pipes.jpg",
  "/images/products/bearing.jpg",
  "/images/products/diesel-engine-parts.jpg",
  "/images/category-electrical.jpg",
  "/images/products/diesel-turbo.jpg",
  "/images/products/heat-exchanger.jpg",
  "/images/products/industrial-pump.jpg",
  "/images/products/diesel-injector.jpg",
];

// Les sous-catégories d'abord : leur choix est plus contraint (moins de
// produits), on les sert donc avant les familles qui puisent dans un vivier
// bien plus large.
for (const category of categories.filter((c) => c.parent_slug)) {
  // Une sous-catégorie n'accepte qu'un vrai cliché produit : les photos
  // thématiques sont réservées aux familles, qui n'ont rien d'autre.
  const products = (byCategory.get(category.slug) ?? []).filter(
    (p) => !isStockPhoto(p.image_url ?? ""),
  );
  const image = pickUnique([products]);
  if (image) {
    category.image_url = image;
    used.add(image);
    assigned += 1;
  } else {
    // Aucun cliché produit : mieux vaut pas d'image du tout qu'une photo
    // d'illustration répétée d'un rayon à l'autre. La carte passe alors en
    // présentation typographique.
    category.image_url = null;
    untouched.push(category.slug);
  }
}

for (const category of categories.filter((c) => !c.parent_slug)) {
  const image =
    pickUnique(productGroupsOfFamily(category.slug)) ??
    FAMILY_FALLBACKS.find((url) => !used.has(url)) ??
    null;

  category.image_url = image;
  if (image) {
    used.add(image);
    assigned += 1;
  } else {
    untouched.push(category.slug);
  }
}

writeFileSync(
  categoriesPath,
  source.slice(0, start + 2) + JSON.stringify(categories, null, 2) + source.slice(end),
  "utf8",
);

const illustrated = categories.filter((c) => c.image_url);
const distinct = new Set(illustrated.map((c) => c.image_url)).size;

console.log(`${assigned} catégories illustrées sur ${categories.length}.`);
console.log(`${distinct} visuels distincts — ${illustrated.length - distinct} doublon(s).`);
if (untouched.length) {
  console.log(
    `Sans visuel (carte typographique) : ${untouched.length} rayon(s).`,
  );
}
