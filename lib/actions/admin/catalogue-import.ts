"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { parseCatalogueFile, slugify, type ImportRow } from "@/lib/catalogue-import";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface ImportState {
  error: string | null;
  /** Renseigné après un passage réussi, pour rendre compte ligne à ligne. */
  report: {
    created: number;
    updated: number;
    skipped: number;
    recognised: Record<string, string>;
    ignored: string[];
    problems: string[];
    dryRun: boolean;
  } | null;
}

/** Découpe pour les requêtes `in (...)`, que PostgREST n'aime pas trop longues. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Importe un tarif fournisseur.
 *
 * Deux modes. En simulation, rien n'est écrit : l'écran rend compte de ce qui
 * serait créé ou mis à jour. C'est le passage obligé avant de toucher à un
 * catalogue de neuf mille références — un fichier mal aligné se rattrape mal.
 *
 * La référence sert de clé : elle existe déjà, on met à jour ; sinon on crée.
 * Le `slug` n'est attribué qu'à la création, pour ne pas casser les liens
 * déjà partagés vers une fiche produit.
 */
export async function importCatalogue(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const locale = localeOf(formData);
  const dryRun = String(formData.get("mode") ?? "") !== "apply";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier.", report: null };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "Fichier trop volumineux (8 Mo maximum).", report: null };
  }

  const parsed = await parseCatalogueFile(
    file.name,
    Buffer.from(await file.arrayBuffer()),
  );

  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    return { error: parsed.errors.join(" "), report: null };
  }

  const supabase = await createClient();

  // Rayons : on accepte le slug comme le libellé, en français ou en anglais.
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name, name_en")
    .returns<{ id: string; slug: string; name: string; name_en: string | null }[]>();

  const categoryByKey = new Map<string, string>();
  for (const category of categories ?? []) {
    categoryByKey.set(category.slug.toLowerCase(), category.id);
    categoryByKey.set(category.name.toLowerCase(), category.id);
    if (category.name_en) categoryByKey.set(category.name_en.toLowerCase(), category.id);
  }

  // Références déjà présentes : une requête par paquet plutôt qu'une par ligne.
  const existing = new Map<string, { id: string; slug: string }>();
  for (const part of chunk(parsed.rows.map((r) => r.reference), 200)) {
    const { data } = await supabase
      .from("products")
      .select("id, slug, reference")
      .in("reference", part)
      .returns<{ id: string; slug: string; reference: string }[]>();
    for (const row of data ?? []) existing.set(row.reference.toLowerCase(), row);
  }

  const problems = [...parsed.errors];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const toInsert: Record<string, unknown>[] = [];
  const usedSlugs = new Set<string>();

  for (const row of parsed.rows) {
    let categoryId: string | null = null;
    if (row.category) {
      categoryId = categoryByKey.get(row.category.toLowerCase()) ?? null;
      if (!categoryId) {
        problems.push(`Ligne ${row.line} : rayon « ${row.category} » inconnu, laissé vide.`);
      }
    }

    const match = existing.get(row.reference.toLowerCase());

    if (match) {
      updated += 1;
      if (!dryRun) {
        const { error } = await supabase
          .from("products")
          .update(fields(row, categoryId))
          .eq("id", match.id);
        if (error) {
          updated -= 1;
          skipped += 1;
          problems.push(`Ligne ${row.line} : ${error.message}`);
        }
      }
      continue;
    }

    // Un slug déjà pris donnerait une erreur d'unicité : on le suffixe.
    let slug = slugify(row.reference) || slugify(row.name);
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    created += 1;
    toInsert.push({ ...fields(row, categoryId), slug });
  }

  if (!dryRun && toInsert.length > 0) {
    for (const part of chunk(toInsert, 250)) {
      const { error } = await supabase.from("products").insert(part);
      if (error) {
        created -= part.length;
        skipped += part.length;
        problems.push(`Insertion refusée : ${error.message}`);
      }
    }
  }

  if (!dryRun) {
    revalidatePath(localePath(locale, "/admin/produits"));
    revalidatePath(localePath(locale, "/catalogue"));
  }

  return {
    error: null,
    report: {
      created: Math.max(0, created),
      updated: Math.max(0, updated),
      skipped,
      recognised: parsed.recognised,
      ignored: parsed.ignored,
      problems: problems.slice(0, 40),
      dryRun,
    },
  };
}

function fields(row: ImportRow, categoryId: string | null) {
  return {
    reference: row.reference,
    name: row.name,
    brand: row.brand,
    description: row.description,
    image_url: row.imageUrl,
    category_id: categoryId,
    is_visible: row.visible,
  };
}
