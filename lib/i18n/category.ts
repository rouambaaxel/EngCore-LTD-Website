import type { Locale } from "./config";
import type { Category } from "@/lib/types";

/** Nom de la catégorie dans la langue demandée, repli sur le français. */
export function categoryName(category: Category, locale: Locale): string {
  if (locale === "en" && category.name_en) return category.name_en;
  return category.name;
}

/** Description de la catégorie dans la langue demandée, repli sur le français. */
export function categoryDescription(category: Category, locale: Locale): string | null {
  if (locale === "en" && category.description_en) return category.description_en;
  return category.description;
}
