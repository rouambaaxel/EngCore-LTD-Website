/**
 * Accès au catalogue.
 *
 * Chaque fonction interroge d'abord Supabase. Si la base n'est pas configurée,
 * injoignable ou vide, on retombe sur le catalogue de démonstration défini dans
 * lib/catalogue-data.ts — le site reste ainsi consultable avant même la mise en
 * place de la base.
 *
 * Les catégories sont hiérarchiques : une famille de premier niveau
 * (`parent_slug === null`) regroupe des sous-catégories qui, elles, portent les
 * produits.
 */

import { createClient } from "@/lib/supabase/server";
import {
  CATALOGUE_CATEGORIES,
  CATALOGUE_PRODUCTS,
  type CatalogueProduct,
} from "@/lib/catalogue-data";
import type { Category, Product } from "@/lib/types";

const FALLBACK_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function toFallbackCategory(slug: string): Category | null {
  const category = CATALOGUE_CATEGORIES.find((item) => item.slug === slug);
  if (!category) return null;
  return {
    id: category.slug,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image_url: category.image_url,
    name_en: category.name_en ?? null,
    description_en: category.description_en ?? null,
    parent_id: category.parent_slug ?? null,
    created_at: FALLBACK_TIMESTAMP,
  };
}

function toFallbackProduct(product: CatalogueProduct): Product {
  return {
    id: product.slug,
    category_id: product.category_slug,
    reference: product.reference,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    image_url: product.image_url ?? null,
    specs: product.specs,
    is_visible: true,
    created_at: FALLBACK_TIMESTAMP,
  };
}

const fallbackCategories = (): Category[] =>
  CATALOGUE_CATEGORIES.map((category) => toFallbackCategory(category.slug)!);

const fallbackProducts = (): Product[] => CATALOGUE_PRODUCTS.map(toFallbackProduct);

/** Toutes les catégories, familles et sous-catégories confondues. */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data && data.length > 0) return data;
  } catch {
    // Base indisponible : on utilise le catalogue de démonstration.
  }
  return fallbackCategories();
}

/** Familles de premier niveau uniquement. */
export async function getRootCategories(): Promise<Category[]> {
  const all = await getAllCategories();
  return all.filter((category) => !category.parent_id);
}

export interface CategoryNode {
  category: Category;
  children: { category: Category; productCount: number }[];
  productCount: number;
}

/** Arborescence complète avec le nombre de produits par nœud. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [all, counts] = await Promise.all([getAllCategories(), getProductCounts()]);
  const roots = all.filter((category) => !category.parent_id);

  return roots.map((root) => {
    const children = all
      .filter((category) => category.parent_id === root.id)
      .map((category) => ({ category, productCount: counts.get(category.id) ?? 0 }));

    const own = counts.get(root.id) ?? 0;
    const total = own + children.reduce((sum, child) => sum + child.productCount, 0);
    return { category: root, children, productCount: total };
  });
}

/** Nombre de produits visibles par catégorie (clé = id de catégorie). */
async function getProductCounts(): Promise<Map<string, number>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("category_id")
      .eq("is_visible", true)
      .returns<{ category_id: string | null }[]>();

    if (data && data.length > 0) {
      const counts = new Map<string, number>();
      for (const row of data) {
        if (!row.category_id) continue;
        counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
      }
      return counts;
    }
  } catch {
    // Base indisponible : on utilise le catalogue de démonstration.
  }

  const counts = new Map<string, number>();
  for (const product of CATALOGUE_PRODUCTS) {
    counts.set(product.category_slug, (counts.get(product.category_slug) ?? 0) + 1);
  }
  return counts;
}

export const PRODUCTS_PER_PAGE = 24;

export interface CategoryPage {
  category: Category;
  /** Sous-catégories, si la catégorie en possède. */
  children: { category: Category; productCount: number }[];
  products: Product[];
  /** Marques présentes dans la catégorie, avec leur nombre de références. */
  brands: { name: string; count: number }[];
  total: number;
  page: number;
  pageCount: number;
}

export async function getCategoryWithProducts(
  slug: string,
  { page = 1, brand }: { page?: number; brand?: string } = {},
): Promise<CategoryPage | null> {
  const from = (page - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  try {
    const supabase = await createClient();
    const { data: category } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single<Category>();

    if (category) {
      const [{ data: childRows }, counts] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("parent_id", category.id)
          .order("name")
          .returns<Category[]>(),
        getProductCounts(),
      ]);

      const children = (childRows ?? []).map((child) => ({
        category: child,
        productCount: counts.get(child.id) ?? 0,
      }));

      // Marques présentes, pour la facette.
      const { data: brandRows } = await supabase
        .from("products")
        .select("brand")
        .eq("category_id", category.id)
        .eq("is_visible", true)
        .returns<{ brand: string | null }[]>();
      const brands = tallyBrands((brandRows ?? []).map((row) => row.brand));

      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("category_id", category.id);
      if (brand) query = query.eq("brand", brand);

      const { data: products, count } = await query
        .order("name")
        .range(from, to)
        .returns<Product[]>();

      const total = count ?? products?.length ?? 0;
      return {
        category,
        children,
        products: products ?? [],
        brands,
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
      };
    }
  } catch {
    // Base indisponible : on utilise le catalogue de démonstration.
  }

  const category = toFallbackCategory(slug);
  if (!category) return null;

  const counts = new Map<string, number>();
  for (const product of CATALOGUE_PRODUCTS) {
    counts.set(product.category_slug, (counts.get(product.category_slug) ?? 0) + 1);
  }

  const children = CATALOGUE_CATEGORIES.filter((item) => item.parent_slug === slug).map(
    (item) => ({
      category: toFallbackCategory(item.slug)!,
      productCount: counts.get(item.slug) ?? 0,
    }),
  );

  const inCategory = CATALOGUE_PRODUCTS.filter((product) => product.category_slug === slug);
  const brands = tallyBrands(inCategory.map((product) => product.brand));

  const matching = inCategory
    .filter((product) => !brand || product.brand === brand)
    .map(toFallbackProduct)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return {
    category,
    children,
    products: matching.slice(from, from + PRODUCTS_PER_PAGE),
    brands,
    total: matching.length,
    page,
    pageCount: Math.max(1, Math.ceil(matching.length / PRODUCTS_PER_PAGE)),
  };
}

/** Compte les occurrences de chaque marque, triées par fréquence décroissante. */
function tallyBrands(values: (string | null)[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const name = (value ?? "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
}

/** Toutes les marques du catalogue, avec leur nombre de références. */
export async function getAllBrands(): Promise<{ name: string; count: number }[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("brand")
      .eq("is_visible", true)
      .returns<{ brand: string | null }[]>();
    if (data && data.length > 0) return tallyBrands(data.map((row) => row.brand));
  } catch {
    // Base indisponible : on utilise le catalogue de démonstration.
  }
  return tallyBrands(CATALOGUE_PRODUCTS.map((product) => product.brand));
}

/**
 * Sélection de produits pour la page d'accueil : uniquement des références
 * avec visuel, réparties entre les catégories pour montrer la largeur de
 * gamme plutôt que N variantes du même disjoncteur.
 */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  // Une vitrine doit montrer l'étendue du catalogue : on répartit entre les
  // familles, pas entre les sous-catégories. Sans cela, les huit produits mis
  // en avant sortaient tous du même rayon.
  const all = await getAllCategories();
  const familyById = new Map(
    all.map((category) => [category.id, category.parent_id ?? category.id]),
  );
  const familyOf = (categoryId: string) => familyById.get(categoryId) ?? categoryId;

  // La photo n'est plus un critère : la majorité du catalogue n'en a pas, et
  // exiger une image reviendrait à ne mettre en avant qu'un seul rayon.
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_visible", true)
      .limit(400)
      .returns<Product[]>();
    if (data && data.length > 0) {
      return spreadAcrossCategories(data, limit, familyOf);
    }
  } catch {
    // Base indisponible : on utilise le catalogue de démonstration.
  }

  return spreadAcrossCategories(
    CATALOGUE_PRODUCTS.map(toFallbackProduct),
    limit,
    familyOf,
  );
}

/** Tour de rôle entre catégories jusqu'à atteindre la limite demandée. */
function spreadAcrossCategories(
  products: Product[],
  limit: number,
  /** Rattache une catégorie à sa famille, pour équilibrer entre métiers. */
  familyOf?: (categoryId: string) => string,
): Product[] {
  const byCategory = new Map<string, Product[]>();
  for (const product of products) {
    const category = product.category_id ?? "";
    const key = familyOf ? familyOf(category) : category;
    const bucket = byCategory.get(key) ?? [];
    bucket.push(product);
    byCategory.set(key, bucket);
  }

  const buckets = [...byCategory.values()];
  const picked: Product[] = [];
  let index = 0;
  while (picked.length < limit && buckets.some((bucket) => bucket.length > index)) {
    for (const bucket of buckets) {
      if (picked.length >= limit) break;
      if (bucket[index]) picked.push(bucket[index]);
    }
    index += 1;
  }
  return picked;
}

export async function getProductBySlug(
  slug: string,
): Promise<(Product & { category: Category | null }) | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("slug", slug)
      .single<Product & { category: Category | null }>();
    if (data) return data;
  } catch {
    // Base indisponible : on utilise le catalogue de démonstration.
  }

  const product = CATALOGUE_PRODUCTS.find((item) => item.slug === slug);
  if (!product) return null;

  return {
    ...toFallbackProduct(product),
    category: toFallbackCategory(product.category_slug),
  };
}

/** Remonte la chaîne des parents d'une catégorie, de la racine vers elle-même. */
export async function getCategoryAncestors(category: Category): Promise<Category[]> {
  if (!category.parent_id) return [];
  const all = await getAllCategories();
  const byId = new Map(all.map((item) => [item.id, item]));

  const chain: Category[] = [];
  let current = category.parent_id ? byId.get(category.parent_id) : undefined;
  while (current) {
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const term = query.trim();
  if (!term) return [];

  try {
    const supabase = await createClient();
    const escaped = term.replace(/[%_,]/g, (match) => `\\${match}`);
    const { data } = await supabase
      .from("products")
      .select("*")
      .or(
        `name.ilike.%${escaped}%,reference.ilike.%${escaped}%,brand.ilike.%${escaped}%`,
      )
      .order("name")
      .returns<Product[]>();
    if (data) return data;
  } catch {
    // Base indisponible : on utilise le catalogue de démonstration.
  }

  const needle = term.toLowerCase();
  return fallbackProducts()
    .filter((product) =>
      [product.name, product.reference, product.brand ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
