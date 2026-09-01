import { notFound } from "next/navigation";
import Link from "next/link";
import AddToCartForm from "@/components/AddToCartForm";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import { getCategoryAncestors, getProductBySlug } from "@/lib/catalogue";
import { getDictionary, localePath } from "@/lib/i18n";
import { categoryName } from "@/lib/i18n/category";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const specs: { label: string; value: string }[] = [
    { label: t.product.reference, value: product.reference },
    ...(product.brand ? [{ label: t.product.brand, value: product.brand }] : []),
    ...(product.category
      ? [{ label: t.product.category, value: categoryName(product.category, locale) }]
      : []),
    ...Object.entries(product.specs ?? {}).map(([label, value]) => ({ label, value })),
  ];

  const ancestors = product.category ? await getCategoryAncestors(product.category) : [];
  const crumbs: Crumb[] = [
    { label: t.common.home, href: p("/") },
    { label: t.catalogue.title, href: p("/catalogue") },
    ...ancestors.map((item) => ({
      label: categoryName(item, locale),
      href: p(`/catalogue/${item.slug}`),
    })),
    ...(product.category
      ? [
          {
            label: categoryName(product.category, locale),
            href: p(`/catalogue/${product.category.slug}`),
          },
        ]
      : []),
    { label: product.name },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={crumbs} label={t.common.breadcrumb} />

      <div className="mt-4 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              /* Pas de photo : on affiche la référence, seul repère fiable
                 pour identifier une pièce détachée. */
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  aria-hidden
                  className="h-12 w-12 text-slate-300"
                >
                  <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
                  <path d="m3 7 9 5 9-5M12 12v10" />
                </svg>
                <p className="font-mono text-sm font-medium text-slate-500">
                  {product.reference}
                </p>
                <p className="text-xs text-slate-400">{t.common.photoComingSoon}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          {product.brand && (
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
              {product.brand}
            </span>
          )}
          <h1 className="mt-1 text-xl font-bold text-slate-900">{product.name}</h1>

          {product.description && (
            <p className="mt-3 text-sm leading-6 text-slate-700">{product.description}</p>
          )}

          <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t.product.datasheet}
          </h2>
          <table className="mt-2 w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
            <tbody className="divide-y divide-slate-200">
              {specs.map((spec) => (
                <tr key={spec.label} className="odd:bg-slate-50">
                  <th className="w-40 px-3 py-2 text-left font-medium text-slate-500">
                    {spec.label}
                  </th>
                  <td className="px-3 py-2 text-slate-900">{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {t.product.priceNotice}
          </div>

          <div className="mt-5">
            <AddToCartForm
              line={{
                slug: product.slug,
                reference: product.reference,
                name: product.name,
                brand: product.brand,
                imageUrl: product.image_url,
              }}
              labels={{
                addToCart: t.cart.addToCart,
                added: t.cart.added,
                quantity: t.cart.quantity,
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={p(`/contact?produit=${product.slug}`)}
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.common.requestQuote}
            </Link>
            <Link
              href={p("/connexion")}
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.product.signInToOrder}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
