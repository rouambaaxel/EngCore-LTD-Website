import Image from "next/image";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

const ACTIVITY_IMAGES = [
  "/images/category-diesel.jpg",
  "/images/category-heavy-equipment.jpg",
  "/images/category-electrical.jpg",
];

export default async function AProposPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.about.title}</h1>
      <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-brand-blue">
        {t.common.tagline}
      </p>
      <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
        {t.about.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold text-slate-900">{t.about.activitiesTitle}</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        {t.about.activities.map((activity, index) => (
          <div key={activity.title} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="relative aspect-[4/3]">
              <Image
                src={ACTIVITY_IMAGES[index]}
                alt={activity.title}
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
              <p className="mt-1 text-xs text-slate-600">{activity.description}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm leading-6 text-slate-700">{t.about.closing}</p>
    </div>
  );
}
