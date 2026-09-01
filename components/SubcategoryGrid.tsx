import Link from "next/link";
import Image from "next/image";
import { localePath } from "@/lib/i18n";
import { formatReferences } from "@/lib/i18n/format";
import { categoryName } from "@/lib/i18n/category";
import type { Locale } from "@/lib/i18n/config";
import type { Category } from "@/lib/types";

export default function SubcategoryGrid({
  items,
  locale,
}: {
  items: { category: Category; productCount: number }[];
  locale: Locale;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ category, productCount }) => (
        <Link
          key={category.id}
          href={localePath(locale, `/catalogue/${category.slug}`)}
          className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-orange hover:shadow-md"
        >
          {/* Faute de visuel, la carte reste typographique : un cadre gris vide
              répété sur toute une grille fait plus négligé que son absence. */}
          {category.image_url && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
              <Image
                src={category.image_url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 group-hover:text-brand-blue">
              {categoryName(category, locale)}
            </p>
            <p className="text-xs text-slate-500">{formatReferences(productCount, locale)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
