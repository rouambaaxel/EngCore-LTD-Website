import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getReconditioningService, RECONDITIONING_SLUGS } from "@/lib/reconditioning";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/lib/i18n/config";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    RECONDITIONING_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export default async function RenovationServicePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const service = getReconditioningService(slug, locale);
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[
          { label: t.common.home, href: p("/") },
          { label: t.catalogue.title, href: p("/catalogue") },
          {
            label: t.home.activities[0].title,
            href: p("/catalogue/pieces-moteur"),
          },
          { label: service.title },
        ]}
      />

      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-blue">
        {t.reconditioning.sectionTitle}
      </p>
      <h1 className="mt-1 text-xl font-bold text-slate-900">{service.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">{service.intro}</p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {t.reconditioning.procedure}
      </h2>
      <ol className="mt-3 space-y-3">
        {service.steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {service.certifications && service.certifications.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t.reconditioning.certifications}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {service.certifications.map((certification) => (
              <li
                key={certification}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {certification}
              </li>
            ))}
          </ul>
        </>
      )}

      {service.note && (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {service.note}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={p(`/contact?service=${service.slug}`)}
          className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.common.requestQuote}
        </Link>
        <Link
          href={p("/catalogue/pieces-moteur")}
          className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t.reconditioning.backToDiesel}
        </Link>
      </div>
    </div>
  );
}
