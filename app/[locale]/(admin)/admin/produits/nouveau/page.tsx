import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/ProductForm";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Category } from "@/lib/types";

async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return data ?? [];
}

export default async function NouveauProduitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.newProductTitle}</h1>
      <ProductForm categories={categories} locale={locale} t={t} />
    </div>
  );
}
