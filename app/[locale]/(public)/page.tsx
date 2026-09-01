import Link from "next/link";
import Image from "next/image";
import { getAllBrands, getCategoryTree, getFeaturedProducts } from "@/lib/catalogue";
import { getDictionary, localePath } from "@/lib/i18n";
import { categoryDescription, categoryName } from "@/lib/i18n/category";
import { formatReferences } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { homeImage } from "@/lib/home-images.generated";

/** Pictogrammes du bandeau de réassurance, dans l'ordre des libellés. */
function TrustIcon({ index }: { index: number }) {
  const shared = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    className: "h-4 w-4",
    "aria-hidden": true,
  } as const;

  switch (index) {
    case 0: // Londres — épingle de carte
      return (
        <svg {...shared}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 1: // livraison internationale — globe
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        </svg>
      );
    case 2: // devis rapide — horloge
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    default: // marques reconnues — bouclier
      return (
        <svg {...shared}>
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const [featured, brands, tree] = await Promise.all([
    getFeaturedProducts(8),
    getAllBrands(),
    getCategoryTree(),
  ]);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-brand-navy">
        <Image
          src="/images/hero-mining.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/90 to-brand-navy/70" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t.home.heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">{t.home.heroText}</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href={p("/catalogue")}
              className="rounded-md bg-brand-orange px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-brand-yellow"
            >
              {t.home.heroCta}
            </Link>
            <Link
              href={p("/contact")}
              className="rounded-md border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t.common.requestQuote}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {t.trust.items.map((item, index) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-brand-orange">
                <TrustIcon index={index} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900">{t.home.activitiesTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.home.activitiesText}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map(({ category, productCount }) => {
            // Visuel propre à l'accueil : une photo qui montre le métier, là où
            // `category.image_url` sert au catalogue en reprenant un produit du
            // rayon. Voir lib/home-images.generated.ts.
            const illustration = homeImage(category.slug);
            return (
            <Link
              key={category.id}
              href={p(`/catalogue/${category.slug}`)}
              className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-brand-orange hover:shadow-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                {illustration && (
                  <Image
                    src={illustration}
                    alt={categoryName(category, locale)}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {categoryName(category, locale)}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {categoryDescription(category, locale)}
                  </p>
                </div>
                <span className="mt-4 text-sm font-medium text-brand-blue">
                  {formatReferences(productCount, locale)}
                </span>
              </div>
            </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-xl font-bold text-slate-900">{t.featured.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.featured.text}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <Link
                key={product.id}
                href={p(`/produits/${product.slug}`)}
                className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-brand-orange hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-50">
                  {product.image_url && (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {product.brand && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                      {product.brand}
                    </span>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-brand-blue">
                    {product.name}
                  </p>
                  <p className="mt-auto pt-2 text-xs text-slate-500">
                    {t.common.reference} {product.reference}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900">{t.brands.homeTitle}</h2>
            <Link
              href={p("/marques")}
              className="inline-flex min-h-10 items-center text-sm font-medium text-brand-blue hover:underline"
            >
              {t.brands.homeAll}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {brands.slice(0, 10).map((brand) => (
              <Link
                key={brand.name}
                href={`${p("/recherche")}?q=${encodeURIComponent(brand.name)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-blue"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-xl font-bold text-slate-900">{t.home.clientTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{t.home.clientText}</p>
          <Link
            href={p("/connexion")}
            className="mt-6 inline-block rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.home.clientCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
