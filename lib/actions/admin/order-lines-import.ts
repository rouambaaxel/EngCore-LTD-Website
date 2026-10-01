"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOrderLineFile } from "@/lib/orders/line-import";
import { localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface LineImportState {
  error: string | null;
  report: {
    added: number;
    /** Lignes rattachées à une fiche du catalogue par leur référence. */
    matched: number;
    /** Lignes conservées en texte libre, faute de référence connue. */
    freeText: number;
    recognised: Record<string, string>;
    ignored: string[];
    problems: string[];
  } | null;
}

/* L'état initial vit dans le composant : voir `invitations.ts`. */

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Ajoute à une commande les lignes d'un fichier envoyé par le client.
 *
 * Pas de simulation préalable, contrairement à l'import d'un tarif : une
 * commande porte quelques dizaines de lignes, toutes supprimables d'un clic
 * juste en dessous. Le coût d'une erreur ne justifie pas une étape de plus.
 *
 * Une référence reconnue rattache la ligne à la fiche produit ; sinon elle
 * est conservée telle quelle. Une pièce hors catalogue est le cas courant,
 * pas une anomalie — c'est tout l'intérêt de la commande saisie à la main.
 */
export async function importOrderLines(
  _prev: LineImportState,
  formData: FormData,
): Promise<LineImportState> {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) return { error: "Commande introuvable.", report: null };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier.", report: null };
  }
  if (file.size > 4 * 1024 * 1024) {
    return { error: "Fichier trop volumineux (4 Mo maximum).", report: null };
  }

  const parsed = await parseOrderLineFile(
    file.name,
    Buffer.from(await file.arrayBuffer()),
  );

  if (parsed.rows.length === 0) {
    return {
      error: parsed.errors.join(" ") || "Aucune ligne exploitable dans ce fichier.",
      report: null,
    };
  }

  const supabase = await createClient();

  // Résolution des références en fiches produits, par paquets plutôt qu'une
  // requête par ligne.
  const references = [...new Set(parsed.rows.map((r) => r.reference).filter(Boolean))] as string[];
  const productByReference = new Map<string, string>();

  for (const part of chunk(references, 200)) {
    const { data } = await supabase
      .from("products")
      .select("id, reference")
      .in("reference", part)
      .returns<{ id: string; reference: string }[]>();
    for (const row of data ?? []) {
      productByReference.set(row.reference.toLowerCase(), row.id);
    }
  }

  const problems = [...parsed.errors];
  let matched = 0;
  let freeText = 0;

  const toInsert = parsed.rows.map((row) => {
    const productId = row.reference
      ? productByReference.get(row.reference.toLowerCase()) ?? null
      : null;

    if (productId) matched += 1;
    else freeText += 1;

    return {
      order_id: orderId,
      product_id: productId,
      // Hors catalogue : on garde référence et désignation ensemble, c'est
      // ce que l'équipe lira sur le bon de préparation.
      free_text_reference: productId
        ? null
        : [row.reference, row.designation].filter(Boolean).join(" — ") || null,
      quantity: row.quantity,
      unit_price: row.unitPrice,
    };
  });

  let added = 0;
  for (const part of chunk(toInsert, 200)) {
    const { error } = await supabase.from("order_items").insert(part);
    if (error) {
      problems.push(`Insertion refusée : ${error.message}`);
    } else {
      added += part.length;
    }
  }

  if (added === 0) {
    return {
      error: problems.join(" ") || "Aucune ligne n'a pu être ajoutée.",
      report: null,
    };
  }

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, `/compte/commandes/${orderId}`));

  return {
    error: null,
    report: {
      added,
      matched,
      freeText,
      recognised: parsed.recognised,
      ignored: parsed.ignored,
      problems: problems.slice(0, 30),
    },
  };
}
