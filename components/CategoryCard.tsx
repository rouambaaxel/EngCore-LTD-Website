import Link from "next/link";
import Image from "next/image";
import { getDictionary, localePath } from "@/lib/i18n";
import { categoryDescription, categoryName } from "@/lib/i18n/category";
import type { Locale } from "@/lib/i18n/config";
import type { Category } from "@/lib/types";

export default function CategoryCard({
  category,
  locale,
}: {
  category: Category;
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const description = categoryDescription(category, locale);

  return (
    <Link
      href={localePath(locale, `/catalogue/${category.slug}`)}
      className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-brand-orange hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt={categoryName(category, locale)}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            {t.common.photoComingSoon}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {categoryName(category, locale)}
          </h3>
          {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        </div>
        <span className="mt-4 text-sm font-medium text-brand-blue">
          {t.common.viewProducts}
        </span>
      </div>
    </Link>
  );
}
