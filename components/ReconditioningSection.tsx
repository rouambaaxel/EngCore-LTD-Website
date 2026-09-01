import Link from "next/link";
import { getDictionary, localePath } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { getReconditioningServices } from "@/lib/reconditioning";

export default function ReconditioningSection({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const services = getReconditioningServices(locale);

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {t.reconditioning.sectionTitle}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        {t.reconditioning.sectionText}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <Link
            key={service.slug}
            href={localePath(locale, `/renovation/${service.slug}`)}
            className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-orange hover:shadow-md"
          >
            <p className="font-semibold text-slate-900">{service.title}</p>
            <p className="mt-1 text-sm text-slate-600">{service.summary}</p>
            <span className="mt-3 inline-block text-sm font-medium text-brand-blue">
              {t.common.learnMore}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
