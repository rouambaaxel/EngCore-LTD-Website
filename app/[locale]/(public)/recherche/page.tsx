import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductRow from "@/components/ProductRow";
import { searchProducts } from "@/lib/catalogue";
import { getDictionary, localePath } from "@/lib/i18n";
import { formatResults } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function RecherchePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: raw } = await params;
  const { q } = await searchParams;

  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const query = q ?? "";
  const results = await searchProducts(query);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[{ label: t.common.home, href: p("/") }, { label: t.search.title }]}
      />
      <h1 className="mt-2 text-xl font-bold text-slate-900">
        {query ? (
          <>
            {t.search.resultsFor} <span className="text-brand-blue">« {query} »</span>
          </>
        ) : (
          t.search.title
        )}
      </h1>

      {query.trim() === "" ? (
        <p className="mt-4 text-sm text-slate-500">{t.search.prompt}</p>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {formatResults(results.length, locale)}
          </p>

          {results.length > 0 ? (
            <div className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {results.map((product) => (
                <ProductRow key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              {t.search.empty}{" "}
              <Link href={p("/contact")} className="text-brand-blue hover:underline">
                {t.search.emptyContact}
              </Link>{" "}
              {t.search.emptyTail}
            </p>
          )}
        </>
      )}
    </div>
  );
}
