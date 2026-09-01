import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

/**
 * Barre de recherche de l'en-tête. Sur mobile elle occupe sa propre ligne :
 * coincée entre le logo et le panier, elle tombait à 94 px de large, ce qui ne
 * laisse pas la place d'une référence.
 */
export default function SearchForm({
  action,
  t,
  className = "",
}: {
  action: string;
  t: Dictionary;
  className?: string;
}) {
  return (
    <form action={action} className={`flex ${className}`}>
      <input
        type="search"
        name="q"
        placeholder={t.common.searchPlaceholder}
        aria-label={t.common.search}
        className="w-full min-w-0 rounded-l-md border border-r-0 border-slate-300 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none"
      />
      <button
        type="submit"
        aria-label={t.common.search}
        className="flex shrink-0 items-center rounded-r-md border border-brand-navy bg-brand-navy px-4 text-white hover:bg-brand-blue"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className="h-4 w-4"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </form>
  );
}
