import Breadcrumbs from "@/components/Breadcrumbs";
import CartView from "@/components/CartView";
import { getSignedInContact } from "@/lib/quotes/contact";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function PanierPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const contact = await getSignedInContact(p("/compte/profil"));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[{ label: t.common.home, href: p("/") }, { label: t.cart.title }]}
      />
      <h1 className="mt-2 text-xl font-bold text-slate-900">{t.cart.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.cart.intro}</p>

      <CartView
        locale={locale}
        t={t}
        catalogueHref={p("/catalogue")}
        contact={contact}
        signUpHref={p("/inscription")}
        signInHref={p("/connexion")}
      />
    </div>
  );
}
