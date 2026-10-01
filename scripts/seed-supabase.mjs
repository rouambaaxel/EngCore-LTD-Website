/**
 * Injecte le catalogue dans une base Supabase, par l'API plutôt que par SQL.
 *
 *   node scripts/seed-supabase.mjs
 *
 * Pourquoi ce script plutôt que `supabase/seed.sql` : ce fichier pèse 4,4 Mo
 * pour 9 168 références. L'éditeur SQL du tableau de bord ne l'avale pas, et
 * `psql` n'est pas toujours installé. Ici, les insertions partent par lots de
 * 500 via la clé de service — même résultat, sans outil supplémentaire.
 *
 * Le script est idempotent : il repose sur les `slug`, uniques en base. Le
 * relancer met à jour l'existant au lieu de créer des doublons.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------------------------------------------------------- */
/* Configuration                                                     */
/* ---------------------------------------------------------------- */

/** Lit .env.local sans dépendance : Next.js n'est pas chargé ici. */
function readEnvFile() {
  const values = {};
  try {
    // Fins de ligne tolérantes : un fichier édité sous Windows porte des CRLF,
    // et le « \r » résiduel empêcherait la capture de chaque valeur.
    for (const line of readFileSync(join(projectRoot, ".env.local"), "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Pas de fichier : on se rabat sur l'environnement du shell.
  }
  return values;
}

const env = { ...readEnvFile(), ...process.env };
const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!url || /^https:\/\/x+\./.test(url)) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL manquante ou encore à sa valeur d'exemple dans .env.local.",
  );
}
if (!serviceKey || serviceKey.startsWith("your-")) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local.\n" +
      "  Tableau de bord Supabase → Project Settings → API → service_role.\n" +
      "  Cette clé contourne la sécurité RLS : elle reste côté serveur, jamais dans le navigateur.",
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------------------------------------------------------------- */
/* Chargement du catalogue                                           */
/* ---------------------------------------------------------------- */

/** Transpile un module TypeScript et résout ses imports `@/…`. */
async function loadTsModule(absPath, seen = new Map()) {
  if (seen.has(absPath)) return seen.get(absPath);

  const { outputText } = ts.transpileModule(readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });

  const specifiers = [...outputText.matchAll(/from\s+["'](@\/[^"']+)["']/g)].map((m) => m[1]);
  let code = outputText;
  for (const specifier of new Set(specifiers)) {
    const target = join(projectRoot, `${specifier.slice(2)}.ts`);
    code = code.replaceAll(specifier, await loadTsModule(target, seen));
  }

  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  seen.set(absPath, dataUrl);
  return dataUrl;
}

const data = await import(await loadTsModule(join(projectRoot, "lib", "catalogue-data.ts")));
const categories = data.CATALOGUE_CATEGORIES;
const products = data.CATALOGUE_PRODUCTS;

console.log(`Catalogue : ${categories.length} catégories, ${products.length} références.`);

/* ---------------------------------------------------------------- */
/* Injection                                                         */
/* ---------------------------------------------------------------- */

const BATCH = 500;

async function upsert(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(slice, { onConflict: conflict });
    if (error) fail(`${table} : ${error.message}`);
    process.stdout.write(
      `\r  ${table} : ${Math.min(i + BATCH, rows.length)} / ${rows.length}   `,
    );
  }
  process.stdout.write("\n");
}

// Les familles d'abord : une sous-catégorie a besoin de l'identifiant de son
// parent, que la base n'attribue qu'à l'insertion.
const roots = categories.filter((c) => !c.parent_slug);
const children = categories.filter((c) => c.parent_slug);

const toCategoryRow = (category, parentId = null) => ({
  name: category.name,
  slug: category.slug,
  description: category.description ?? null,
  name_en: category.name_en ?? null,
  description_en: category.description_en ?? null,
  image_url: category.image_url ?? null,
  parent_id: parentId,
});

console.log("\nCatégories racines…");
await upsert("categories", roots.map((c) => toCategoryRow(c)), "slug");

const { data: saved, error: readError } = await supabase
  .from("categories")
  .select("id, slug");
if (readError) fail(`relecture des catégories : ${readError.message}`);

const idBySlug = new Map(saved.map((row) => [row.slug, row.id]));

console.log("Sous-catégories…");
await upsert(
  "categories",
  children.map((c) => toCategoryRow(c, idBySlug.get(c.parent_slug) ?? null)),
  "slug",
);

// Relecture : les sous-catégories viennent de recevoir leur identifiant.
const { data: allCategories } = await supabase.from("categories").select("id, slug");
const categoryId = new Map((allCategories ?? []).map((row) => [row.slug, row.id]));

console.log("Produits…");
await upsert(
  "products",
  products.map((product) => ({
    category_id: categoryId.get(product.category_slug) ?? null,
    reference: product.reference,
    name: product.name,
    slug: product.slug,
    description: product.description ?? null,
    brand: product.brand ?? null,
    image_url: product.image_url ?? null,
    specs: product.specs ?? {},
    is_visible: true,
  })),
  "slug",
);

const [{ count: categoryCount }, { count: productCount }] = await Promise.all([
  supabase.from("categories").select("*", { count: "exact", head: true }),
  supabase.from("products").select("*", { count: "exact", head: true }),
]);

console.log(
  `\n✓ En base : ${categoryCount} catégorie(s), ${productCount} référence(s).`,
);
