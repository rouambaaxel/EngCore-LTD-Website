"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logWrite } from "./write";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { parseSpecs } from "@/lib/specs";

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface ProductActionState {
  error: string | null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);
  const name = String(formData.get("name") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const specs = parseSpecs(String(formData.get("specs") ?? ""));
  const isVisible = formData.get("is_visible") === "on";

  if (!name || !reference) {
    return { error: t.admin.requiredFields };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name,
    reference,
    slug: slugify(name) || slugify(reference),
    category_id: categoryId,
    brand,
    description,
    image_url: imageUrl,
    specs,
    is_visible: isVisible,
  });

  if (error) {
    return { error: t.admin.createProductError + error.message };
  }

  revalidatePath(localePath(locale, "/admin/produits"));
  redirect(localePath(locale, "/admin/produits"));
}

export async function updateProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const specs = parseSpecs(String(formData.get("specs") ?? ""));
  const isVisible = formData.get("is_visible") === "on";

  if (!id || !name || !reference) {
    return { error: t.admin.requiredFields };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name,
      reference,
      category_id: categoryId,
      brand,
      description,
      image_url: imageUrl,
      specs,
      is_visible: isVisible,
    })
    .eq("id", id);

  if (error) {
    return { error: t.admin.saveProductError + error.message };
  }

  revalidatePath(localePath(locale, "/admin/produits"));
  redirect(localePath(locale, "/admin/produits"));
}

export async function deleteProduct(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  logWrite(
    "suppression d'un produit",
    await supabase.from("products").delete().eq("id", id),
  );
  revalidatePath(localePath(locale, "/admin/produits"));
}
