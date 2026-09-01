"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from "@/lib/i18n/config";

/**
 * Bascule FR/EN en conservant la page courante : on remplace simplement le
 * premier segment de l'URL, les slugs étant identiques dans les deux langues.
 *
 * `useSearchParams` empêche le pré-rendu statique de la page entière, alors
 * qu'il ne sert qu'à recopier la query string. On l'isole donc derrière un
 * `Suspense` : le reste de la page reste statique, et le repli affiche le même
 * sélecteur, simplement sans query string — le temps d'un instant, et sans
 * décalage de mise en page.
 */
export default function LanguageSwitcher(props: { locale: Locale; label: string }) {
  return (
    <Suspense fallback={<Switcher {...props} query="" />}>
      <SwitcherWithQuery {...props} />
    </Suspense>
  );
}

function SwitcherWithQuery(props: { locale: Locale; label: string }) {
  const searchParams = useSearchParams();
  return <Switcher {...props} query={searchParams.toString()} />;
}

function Switcher({
  locale,
  label,
  query,
}: {
  locale: Locale;
  label: string;
  query: string;
}) {
  const pathname = usePathname();

  const hrefFor = (target: Locale) => {
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = target;
    return `/${segments.join("/")}${query ? `?${query}` : ""}`;
  };

  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {LOCALES.map((item, index) => (
        <span key={item} className="flex items-center gap-1">
          {index > 0 && <span aria-hidden className="text-white/30">|</span>}
          {item === locale ? (
            <span
              aria-current="true"
              className="inline-flex min-h-8 items-center font-semibold text-white"
            >
              {LOCALE_SHORT[item]}
            </span>
          ) : (
            <Link
              href={hrefFor(item)}
              hrefLang={item}
              title={LOCALE_LABELS[item]}
              /* `min-h-8` / `px-1` : deux lettres ne font pas une cible. */
              className="inline-flex min-h-8 items-center px-1 hover:text-white"
            >
              {LOCALE_SHORT[item]}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
