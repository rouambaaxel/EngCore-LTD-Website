import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/ProductForm";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Category, Product } from "@/lib/types";

async function getData(id: string): Promise<{ product: Product; categories: Category[] } | null> {
  const supabase = await createClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!product) return null;
  return { product, categories: categories ?? [] };
}

export default async function EditProduitPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const result = await getData(id);
  if (!result) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.editProductTitle}</h1>
      <ProductForm
        categories={result.categories}
        product={result.product}
        locale={locale}
        t={t}
      />
    </div>
  );
}
