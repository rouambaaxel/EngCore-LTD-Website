/**
 * Génère lib/catalogue-categories.generated.ts à partir de scripts/taxonomy.mjs,
 * afin que l'arborescence du site et le classement à l'import proviennent
 * d'une définition unique.
 *
 * Usage : npm run generate:categories
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT_CATEGORIES, SUB_CATEGORIES } from "./taxonomy.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const categories = [
  ...ROOT_CATEGORIES.map((category) => ({ ...category, parent_slug: null })),
  ...SUB_CATEGORIES,
];

const file = `/**
 * ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
 * Source : scripts/taxonomy.mjs — régénérer avec \`npm run generate:categories\`.
 *
 * ${ROOT_CATEGORIES.length} familles, ${SUB_CATEGORIES.length} sous-catégories.
 */

import type { CatalogueCategory } from "@/lib/catalogue-data";

export const CATALOGUE_CATEGORIES: CatalogueCategory[] = ${JSON.stringify(categories, null, 2)};
`;

writeFileSync(join(projectRoot, "lib", "catalogue-categories.generated.ts"), file, "utf8");
console.log(
  `${ROOT_CATEGORIES.length} familles + ${SUB_CATEGORIES.length} sous-catégories générées.`,
);
