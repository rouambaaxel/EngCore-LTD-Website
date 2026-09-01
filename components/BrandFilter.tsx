import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

export default function BrandFilter({
  basePath,
  brands,
  selected,
  locale,
}: {
  basePath: string;
  brands: { name: string; count: number }[];
  selected?: string;
  locale: Locale;
}) {
  // Une seule marque : la facette n'apporte rien.
  if (brands.length < 2) return null;
  const t = getDictionary(locale);

  const href = (brand?: string) =>
    brand ? `${basePath}?marque=${encodeURIComponent(brand)}` : basePath;

  // `min-h-9` : à `py-1` les pastilles faisaient 25 px de haut, sous le seuil
  // confortable au doigt. La densité visuelle reste la même à l'œil.
  const chip =
    "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition";
  const inactive = "border-slate-300 text-slate-700 hover:bg-slate-50";
  const active = "border-brand-navy bg-brand-navy text-white";

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t.common.brand}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link href={href()} className={`${chip} ${selected ? inactive : active}`}>
          {t.common.allBrands}
        </Link>
        {brands.map((brand) => (
          <Link
            key={brand.name}
            href={href(brand.name)}
            className={`${chip} ${selected === brand.name ? active : inactive}`}
          >
            {brand.name}
            <span className={selected === brand.name ? "text-white/70" : "text-slate-400"}>
              {" "}
              ({brand.count})
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
