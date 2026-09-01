/**
 * Génère supabase/seed.sql à partir de lib/catalogue-data.ts.
 *
 * Usage : npm run generate:seed
 *
 * lib/catalogue-data.ts est la source unique de vérité du catalogue de
 * démonstration : il alimente à la fois le site (quand Supabase n'est pas
 * encore configuré) et ce fichier SQL.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(projectRoot, "lib", "catalogue-data.ts");
const seedPath = join(projectRoot, "supabase", "seed.sql");

/**
 * Transpile un module TypeScript et le charge via une data URL. Les imports en
 * `@/…` (alias du projet) sont résolus récursivement, faute de quoi le
 * navigateur d'ESM ne saurait pas les localiser.
 */
async function loadTsModule(absPath, seen = new Map()) {
  if (seen.has(absPath)) return seen.get(absPath);

  const { outputText } = ts.transpileModule(readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });

  // Remplace chaque « @/x/y » par la data URL du module correspondant.
  const specifiers = [...outputText.matchAll(/from\s+["'](@\/[^"']+)["']/g)].map((m) => m[1]);
  let code = outputText;
  for (const specifier of new Set(specifiers)) {
    const target = join(projectRoot, `${specifier.slice(2)}.ts`);
    const url = await loadTsModule(target, seen);
    code = code.replaceAll(specifier, url);
  }

  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  seen.set(absPath, dataUrl);
  return dataUrl;
}

const { CATALOGUE_CATEGORIES, CATALOGUE_PRODUCTS } = await import(
  await loadTsModule(dataPath)
);

/** Échappe une valeur pour un littéral texte SQL. */
const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`;

const sqlNullable = (value) => (value == null || value === "" ? "null" : sqlString(value));

const categoryTuple = (category) =>
  `  (${sqlString(category.name)}, ${sqlString(category.slug)}, ` +
  `${sqlString(category.description)}, ${sqlNullable(category.name_en)}, ` +
  `${sqlNullable(category.description_en)}, ${sqlString(category.image_url)}` +
  (category.parent_slug ? `, ${sqlString(category.parent_slug)})` : ")");

// Deux instructions distinctes : une insertion ne voit pas les lignes qu'elle
// crée elle-même, donc les parents doivent être commités avant les enfants.
const rootValues = CATALOGUE_CATEGORIES.filter((c) => !c.parent_slug)
  .map(categoryTuple)
  .join(",\n");

const childValues = CATALOGUE_CATEGORIES.filter((c) => c.parent_slug)
  .map(categoryTuple)
  .join(",\n");

const productValues = CATALOGUE_PRODUCTS.map(
  (product) =>
    `  (${sqlString(product.reference)}, ${sqlString(product.name)}, ` +
    `${sqlString(product.slug)}, ${sqlString(product.description)}, ` +
    `${sqlString(product.brand)}, ${sqlString(JSON.stringify(product.specs))}::jsonb, ` +
    `${sqlNullable(product.image_url)}, ${sqlString(product.category_slug)})`,
).join(",\n");

const seed = `-- ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
-- Source : lib/catalogue-data.ts — régénérer avec \`npm run generate:seed\`.
--
-- Données de démonstration pour le catalogue public.
-- À exécuter après 0001_init.sql.
--
-- Les image_url des catégories pointent vers /public/images (livrées avec le
-- site). Remplacez-les par vos propres photos si besoin.

-- 1) Familles de premier niveau.
insert into public.categories (name, slug, description, name_en, description_en, image_url) values
${rootValues}
on conflict (slug) do nothing;

-- 2) Sous-catégories : le parent existe désormais, on le résout par son slug.
insert into public.categories (name, slug, description, name_en, description_en, image_url, parent_id)
select v.name, v.slug, v.description, v.name_en, v.description_en, v.image_url, parent.id
from (values
${childValues}
) as v(name, slug, description, name_en, description_en, image_url, parent_slug)
join public.categories parent on parent.slug = v.parent_slug
on conflict (slug) do nothing;

insert into public.products (category_id, reference, name, slug, description, brand, specs, image_url, is_visible)
select c.id, v.reference, v.name, v.slug, v.description, v.brand, v.specs, v.image_url, true
from (values
${productValues}
) as v(reference, name, slug, description, brand, specs, image_url, category_slug)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;
`;

writeFileSync(seedPath, seed, "utf8");
console.log(
  `supabase/seed.sql généré : ${CATALOGUE_CATEGORIES.length} catégories, ${CATALOGUE_PRODUCTS.length} produits.`,
);
