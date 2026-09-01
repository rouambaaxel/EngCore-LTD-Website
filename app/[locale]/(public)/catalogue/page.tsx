import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryCard from "@/components/CategoryCard";
import { getCategoryTree } from "@/lib/catalogue";
import { getDictionary, localePath } from "@/lib/i18n";
import { formatReferences } from "@/lib/i18n/format";
import { categoryDescription, categoryName } from "@/lib/i18n/category";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function CataloguePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const tree = await getCategoryTree();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[{ label: t.common.home, href: p("/") }, { label: t.catalogue.title }]}
      />
      <h1 className="mt-2 text-xl font-bold text-slate-900">{t.catalogue.title}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.catalogue.intro}</p>

      {tree.length > 0 ? (
        <div className="mt-6 space-y-10">
          {tree.map(({ category, children, productCount }) => {
            const description = categoryDescription(category, locale);
            return (
              <section key={category.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    <Link
                      href={p(`/catalogue/${category.slug}`)}
                      className="inline-flex min-h-10 items-center hover:text-brand-blue"
                    >
                      {categoryName(category, locale)}
                    </Link>
                  </h2>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formatReferences(productCount, locale)}
                  </span>
                </div>
                {description && (
                  <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
                )}

                {children.length > 0 ? (
                  <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                    {children.map(({ category: child, productCount: childCount }) => (
                      <li key={child.id}>
                        <Link
                          href={p(`/catalogue/${child.slug}`)}
                          className="flex min-h-10 items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm text-slate-700 hover:text-brand-blue"
                        >
                          <span>{categoryName(child, locale)}</span>
                          <span className="shrink-0 text-xs text-slate-400">{childCount}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 max-w-sm">
                    <CategoryCard category={category} locale={locale} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="mt-8 text-sm text-slate-500">{t.catalogue.emptyCatalogue}</p>
      )}
    </div>
  );
}
