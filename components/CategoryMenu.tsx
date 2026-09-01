"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Menu déroulant des familles, sur la barre de navigation de bureau.
 *
 * Il s'ouvrait uniquement au survol. Une tablette dépasse le seuil `md`, donc
 * affichait la barre — mais le survol n'existe pas au doigt et le menu restait
 * clos. Il s'ouvre désormais au clic sur le chevron ; le survol reste un
 * confort à la souris, et le libellé demeure un lien direct vers le catalogue.
 */
export default function CategoryMenu({
  label,
  catalogueHref,
  items,
}: {
  label: string;
  catalogueHref: string;
  items: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={container}
      className="group relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center border-b-2 border-transparent py-2 has-[a:hover]:border-brand-orange">
        <Link href={catalogueHref} className="py-1 hover:text-brand-blue">
          {label}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={label}
          className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-brand-blue"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
            className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 w-[36rem] rounded-b-lg border border-slate-200 bg-white p-4 shadow-lg">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700 hover:bg-slate-50 hover:text-brand-blue"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
