import Link from "next/link";
import Image from "next/image";
import { getDictionary, localePath } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { Product } from "@/lib/types";

export default function ProductRow({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const t = getDictionary(locale);

  return (
    <Link
      href={localePath(locale, `/produits/${product.slug}`)}
      className="flex items-center gap-4 px-3 py-3 hover:bg-slate-50"
    >
      {/*
        Sans visuel, on met la référence en avant plutôt qu'un cadre vide :
        c'est de toute façon par elle qu'un acheteur identifie une pièce.
      */}
      {product.image_url ? (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
            className="h-5 w-5 text-slate-300"
          >
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
            <path d="m3 7 9 5 9-5M12 12v10" />
          </svg>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Les libellés fabricant sont longs : sur un écran étroit, deux
            lignes valent mieux qu'une troncature au tiers du nom. */}
        <p className="line-clamp-2 font-medium text-slate-900 sm:truncate">
          {product.name}
        </p>
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">{product.reference}</span>
          {product.brand && <span> · {product.brand}</span>}
        </p>
      </div>

      <span className="hidden shrink-0 text-sm font-medium text-brand-blue sm:inline">
        {t.common.viewDatasheet}
      </span>
    </Link>
  );
}
