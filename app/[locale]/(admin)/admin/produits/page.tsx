import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteProduct } from "@/lib/actions/admin/products";
import Pagination from "@/components/Pagination";
import { getDictionary, localePath } from "@/lib/i18n";
import { categoryName } from "@/lib/i18n/category";
import { formatRange, formatReferences } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Category, Product } from "@/lib/types";

const PER_PAGE = 50;

/**
 * Le catalogue compte plus de neuf mille references : une liste d'un seul
 * tenant ne pouvait de toute facon pas les afficher, PostgREST s'arretant a
 * 1 000 lignes sans le signaler. On pagine, et on cherche.
 */
async function getProducts(page: number, query: string) {
  const supabase = await createClient();
  const from = (page - 1) * PER_PAGE;

  let request = supabase
    .from("products")
    .select("*, category:categories(*)", { count: "exact" });

  if (query) {
    const escaped = query.replace(/[%_,]/g, (match) => `\\${match}`);
    request = request.or(
      `name.ilike.%${escaped}%,reference.ilike.%${escaped}%,brand.ilike.%${escaped}%`,
    );
  }

  const { data, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1)
    .returns<(Product & { category: Category | null })[]>();

  return { products: data ?? [], total: count ?? 0 };
}

export default async function AdminProduitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  const { page: pageParam, q } = await searchParams;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const parsed = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const query = (q ?? "").trim();

  const { products, total } = await getProducts(page, query);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const firstIndex = (page - 1) * PER_PAGE + 1;
  const lastIndex = Math.min(page * PER_PAGE, total);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.admin.products}</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href={p("/admin/produits/import")}
            className="inline-flex min-h-10 items-center rounded-md border border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
          >
            {t.admin.importLink}
          </Link>
          <Link
            href={p("/admin/produits/nouveau")}
            className="inline-flex min-h-10 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.admin.newProduct}
          </Link>
        </div>
      </div>

      <form action={p("/admin/produits")} className="mt-6 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t.common.searchPlaceholder}
          aria-label={t.common.search}
          className="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md border border-brand-navy bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.common.search}
        </button>
      </form>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {formatReferences(total, locale)}
        {pageCount > 1 && (
          <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
            {formatRange(firstIndex, lastIndex, locale)}
          </span>
        )}
      </p>

      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
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

      <Pagination
        basePath={p("/admin/produits")}
        page={page}
        pageCount={pageCount}
        locale={locale}
        query={query ? { q: query } : undefined}
      />
    </div>
  );
}
