import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getAllBrands } from "@/lib/catalogue";
import { getDictionary, localePath } from "@/lib/i18n";
import { formatReferences } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function MarquesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const brands = await getAllBrands();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[{ label: t.common.home, href: p("/") }, { label: t.brands.title }]}
      />
      <h1 className="mt-2 text-xl font-bold text-slate-900">{t.brands.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.brands.intro}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            href={`${p("/recherche")}?q=${encodeURIComponent(brand.name)}`}
            className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-orange hover:shadow-md"
          >
            <p className="font-semibold text-slate-900 group-hover:text-brand-blue">
              {brand.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatReferences(brand.count, locale)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
