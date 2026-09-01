import { notFound } from "next/navigation";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import BrandFilter from "@/components/BrandFilter";
import Pagination from "@/components/Pagination";
import ProductRow from "@/components/ProductRow";
import ReconditioningSection from "@/components/ReconditioningSection";
import SubcategoryGrid from "@/components/SubcategoryGrid";
import {
  getCategoryAncestors,
  getCategoryWithProducts,
  PRODUCTS_PER_PAGE,
} from "@/lib/catalogue";
import { getDictionary, localePath } from "@/lib/i18n";
import { formatBrandFilter, formatRange, formatReferences } from "@/lib/i18n/format";
import { categoryDescription, categoryName } from "@/lib/i18n/category";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string; marque?: string }>;
}) {
  const { locale: raw, slug } = await params;
  const { page: pageParam, marque } = await searchParams;

  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const parsed = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  const result = await getCategoryWithProducts(slug, {
    page: requestedPage,
    brand: marque,
  });
  if (!result) notFound();

  const { category, children, products, brands, total, page, pageCount } = result;
  if (requestedPage > pageCount && total > 0) notFound();

  const ancestors = await getCategoryAncestors(category);
  const crumbs: Crumb[] = [
    { label: t.common.home, href: p("/") },
    { label: t.catalogue.title, href: p("/catalogue") },
    ...ancestors.map((item) => ({
      label: categoryName(item, locale),
      href: p(`/catalogue/${item.slug}`),
    })),
    { label: categoryName(category, locale) },
  ];

  const basePath = p(`/catalogue/${category.slug}`);
  const description = categoryDescription(category, locale);
  const firstIndex = (page - 1) * PRODUCTS_PER_PAGE + 1;
  const lastIndex = Math.min(page * PRODUCTS_PER_PAGE, total);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={crumbs} label={t.common.breadcrumb} />
      <h1 className="mt-2 text-xl font-bold text-slate-900">
        {categoryName(category, locale)}
      </h1>
      {description && (
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
      )}

      {children.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.catalogue.subcategories}
          </h2>
          <SubcategoryGrid items={children} locale={locale} />
        </section>
      )}

      {total > 0 && (
        <section className={children.length > 0 ? "mt-10" : "mt-6"}>
          {children.length > 0 && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.catalogue.productsInCategory}
            </h2>
          )}

          <BrandFilter
            basePath={basePath}
            brands={brands}
            selected={marque}
            locale={locale}
          />

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {formatReferences(total, locale)}
            {marque && (
              <span className="normal-case">{formatBrandFilter(marque, locale)}</span>
            )}
            {pageCount > 1 && (
              <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
                {formatRange(firstIndex, lastIndex, locale)}
              </span>
            )}
          </p>

          <div className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} locale={locale} />
            ))}
          </div>

          <Pagination
            basePath={basePath}
            page={page}
            pageCount={pageCount}
            locale={locale}
            query={marque ? { marque } : undefined}
          />
        </section>
      )}

      {total === 0 && children.length === 0 && (
        <p className="mt-8 text-sm text-slate-500">{t.catalogue.emptyCategory}</p>
      )}

      {category.slug === "pieces-moteur" && (
        <ReconditioningSection locale={locale} />
      )}
    </div>
  );
}
