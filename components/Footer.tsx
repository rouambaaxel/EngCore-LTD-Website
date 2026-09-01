import Link from "next/link";
import { getDictionary, localePath } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

/** `min-h-9` : le pied de page est le recours quand on cherche un lien au doigt. */
const footerLink = "inline-flex min-h-9 items-center hover:text-white";

export default function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  return (
    <footer className="mt-auto border-t border-black/10 bg-brand-navy text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold tracking-wide text-white">
            ENGCORE <span className="text-brand-orange">LTD</span>
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-yellow">
            {t.common.tagline}
          </p>
          <p className="mt-3 text-sm text-slate-400">{t.footer.description}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t.footer.navigation}</p>
          <ul className="mt-1 text-sm">
            {[
              { href: p("/catalogue"), label: t.common.catalogue },
              { href: p("/marques"), label: t.brands.navLabel },
              { href: p("/a-propos"), label: t.common.about },
              { href: p("/contact"), label: t.common.contact },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={footerLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t.footer.clientArea}</p>
          <ul className="mt-1 text-sm">
            {[
              { href: p("/connexion"), label: t.common.signIn },
              { href: p("/inscription"), label: t.common.signUp },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={footerLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500 sm:px-6">
        © {new Date().getFullYear()} Engcore Ltd. {t.footer.rights}
      </div>
    </footer>
  );
}
