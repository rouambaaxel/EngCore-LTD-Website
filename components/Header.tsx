import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/supabase/server";
import { getRootCategories } from "@/lib/catalogue";
import { signOut } from "@/lib/actions/auth";
import { getDictionary, localePath } from "@/lib/i18n";
import { categoryName } from "@/lib/i18n/category";
import type { Locale } from "@/lib/i18n/config";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CartIndicator from "@/components/CartIndicator";
import CategoryMenu from "@/components/CategoryMenu";
import MobileNav from "@/components/MobileNav";
import SearchForm from "@/components/SearchForm";

export default async function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  // L'en-tête s'affiche sur toutes les pages publiques : sans base configurée,
  // interroger la session ferait attendre chaque page une réponse qui ne
  // viendra pas. On considère alors qu'aucun client n'est connecté.
  const [user, roots] = await Promise.all([getSessionUser(), getRootCategories()]);

  const p = (path: string) => localePath(locale, path);

  // Les dix familles tiennent dans un menu déroulant : alignées sur une seule
  // rangée, elles repoussaient « Marques », « À propos » et « Contact » hors
  // de l'écran.
  const navLinks = [
    { href: p("/marques"), label: t.brands.navLabel },
    { href: p("/a-propos"), label: t.common.about },
    { href: p("/contact"), label: t.common.contact },
  ];

  const families = roots.map((category) => ({
    href: p(`/catalogue/${category.slug}`),
    label: categoryName(category, locale),
  }));

  // Le même bloc sert la barre haute (bureau) et le panneau mobile ; le rendu
  // reste côté serveur pour que l'action `signOut` conserve son formulaire.
  const accountLinks = (className: string, formClassName = "") =>
    user ? (
      <>
        <Link href={p("/compte")} className={className}>
          {t.common.myAccount}
        </Link>
        <form action={signOut} className={formClassName}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={className}>
            {t.common.signOut}
          </button>
        </form>
      </>
    ) : (
      <>
        <Link href={p("/connexion")} className={className}>
          {t.common.signIn}
        </Link>
        <Link href={p("/inscription")} className={className}>
          {t.common.signUp}
        </Link>
      </>
    );

  return (
    <header className="relative border-b border-slate-200 bg-white">
      <div className="bg-brand-navy text-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-xs sm:px-6">
          <span className="hidden font-medium tracking-wide text-brand-yellow sm:inline">
            {t.common.tagline}
          </span>
          <div className="flex items-center gap-4">
            {/* Sur mobile ces liens vivent dans le panneau, où ils sont
                cliquables au doigt plutôt que hauts de 16 px. */}
            <div className="hidden items-center gap-4 sm:flex">
              {accountLinks("hover:text-white")}
            </div>
            <LanguageSwitcher locale={locale} label={t.common.languageLabel} />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <MobileNav
          openLabel={t.common.menu}
          closeLabel={t.common.closeMenu}
          categoriesLabel={t.common.categories}
          catalogueLabel={t.common.catalogue}
          catalogueHref={p("/catalogue")}
          families={families}
          links={navLinks}
          account={
            <div className="flex flex-col">
              {accountLinks(
                "block rounded px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-blue",
              )}
            </div>
          }
        />

        <Link href={p("/")} className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Engcore Ltd — Expertise and reliability"
            width={392}
            height={137}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <SearchForm
          action={p("/recherche")}
          t={t}
          className="hidden flex-1 max-w-xl md:flex"
        />

        <div className="ml-auto md:ml-0">
          <CartIndicator href={p("/panier")} label={t.cart.nav} />
        </div>
      </div>

      {/* Sur téléphone la recherche prend toute la largeur : coincée entre le
          logo et le panier, elle tombait à 94 px. */}
      <div className="border-t border-slate-200 px-4 pb-3 pt-2 md:hidden">
        <SearchForm action={p("/recherche")} t={t} />
      </div>

      <nav className="hidden border-t border-slate-200 bg-slate-50 md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:px-6">
          <CategoryMenu
            label={t.common.categories}
            catalogueHref={p("/catalogue")}
            items={families}
          />

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b-2 border-transparent py-3 hover:border-brand-orange hover:text-brand-blue"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
