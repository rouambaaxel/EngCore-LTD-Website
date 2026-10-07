"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/CategoryMenu";

/**
 * Navigation du téléphone.
 *
 * La barre de navigation est masquée sous 768 px. Rien ne la remplaçait : les
 * dix familles, les marques, « À propos » et « Contact » étaient hors de
 * portée, et le catalogue n'était atteignable que par le bouton de la page
 * d'accueil. Ce panneau rétablit l'ensemble des accès.
 */
export default function MobileNav({
  openLabel,
  closeLabel,
  categoriesLabel,
  catalogueLabel,
  catalogueHref,
  families,
  links,
  account,
}: {
  openLabel: string;
  closeLabel: string;
  categoriesLabel: string;
  catalogueLabel: string;
  catalogueHref: string;
  families: NavItem[];
  links: NavItem[];
  /** Bloc « connexion » ou « mon compte », rendu côté serveur. */
  account: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Une navigation réussie doit refermer le panneau, sinon il masque la page
  // qui vient de s'ouvrir. Ajusté pendant le rendu plutôt que dans un effet :
  // l'effet affichait d'abord la nouvelle page sous le panneau encore ouvert.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const itemClass =
    "block rounded px-3 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-blue";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? closeLabel : openLabel}
        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className="h-6 w-6"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 max-h-[75vh] overflow-y-auto border-b border-slate-200 bg-white shadow-lg md:hidden">
          <nav className="px-4 py-3" aria-label={categoriesLabel}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {categoriesLabel}
            </p>
            <ul>
              {families.map((family) => (
                <li key={family.href}>
                  <Link href={family.href} className={itemClass}>
                    {family.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={catalogueHref}
                  className={`${itemClass} font-semibold text-brand-blue`}
                >
                  {`${catalogueLabel} →`}
                </Link>
              </li>
            </ul>

            <ul className="mt-2 border-t border-slate-200 pt-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={`${itemClass} font-medium`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-2 border-t border-slate-200 pt-2">{account}</div>
          </nav>
        </div>
      )}
    </>
  );
}
