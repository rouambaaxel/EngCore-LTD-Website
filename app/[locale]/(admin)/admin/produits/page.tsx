import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteProduct } from "@/lib/actions/admin/products";
import { getDictionary, localePath } from "@/lib/i18n";
import { categoryName } from "@/lib/i18n/category";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Category, Product } from "@/lib/types";

async function getProducts(): Promise<(Product & { category: Category | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminProduitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const products = await getProducts();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.admin.products}</h1>
        <Link
          href={p("/admin/produits/nouveau")}
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.admin.newProduct}
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">{t.admin.product}</th>
              <th className="px-4 py-2">{t.admin.category}</th>
              <th className="px-4 py-2">{t.admin.visible}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    {t.common.reference} {product.reference}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {product.category ? categoryName(product.category, locale) : "—"}
                </td>
                <td className="px-4 py-3">
                  {product.is_visible ? (
                    <span className="text-green-700">{t.admin.yes}</span>
                  ) : (
                    <span className="text-slate-400">{t.admin.no}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={p(`/admin/produits/${product.id}`)}
                      className="text-brand-blue hover:underline"
                    >
                      {t.admin.edit}
                    </Link>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="text-red-600 hover:underline">
                        {t.admin.delete}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  {t.admin.noProducts}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
