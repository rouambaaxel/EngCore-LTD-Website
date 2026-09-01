import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

/** Construit une fenêtre de pages autour de la page courante, avec ellipses. */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < pageCount - 1) items.push("…");
  items.push(pageCount);
  return items;
}

export default function Pagination({
  basePath,
  page,
  pageCount,
  locale,
  query,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  locale: Locale;
  /** Paramètres à conserver d'une page à l'autre (filtres actifs). */
  query?: Record<string, string>;
}) {
  if (pageCount <= 1) return null;
  const t = getDictionary(locale);

  const href = (n: number) => {
    const params = new URLSearchParams(query);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  // `min-h-10` / `min-w-10` : les numéros de page sont les cibles les plus
  // souvent manquées au doigt, parce que les plus étroites.
  const linkClass =
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

  return (
    <nav aria-label={t.common.pagination} className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass} rel="prev">
          {t.common.previous}
        </Link>
      ) : (
        <span className={`${linkClass} cursor-default opacity-40`}>{t.common.previous}</span>
      )}

      {pageWindow(page, pageCount).map((item, index) =>
        item === "…" ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-slate-400">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white"
          >
            {item}
          </span>
        ) : (
          <Link key={item} href={href(item)} className={linkClass}>
            {item}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link href={href(page + 1)} className={linkClass} rel="next">
          {t.common.next}
        </Link>
      ) : (
        <span className={`${linkClass} cursor-default opacity-40`}>{t.common.next}</span>
      )}
    </nav>
  );
}
