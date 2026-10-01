import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`${p("/connexion")}?next=${encodeURIComponent(p("/admin"))}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect(p("/compte"));

  const navLinks = [
    { href: p("/admin/comptes"), label: t.admin.accounts },
    { href: p("/admin/invitations"), label: t.admin.invitations },
    { href: p("/admin/devis"), label: t.admin.quotes },
    { href: p("/admin/commandes"), label: t.admin.orders },
    { href: p("/admin/produits"), label: t.admin.products },
  ];

  return (
    <>
      <Header locale={locale} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl gap-8 px-4 py-10 sm:px-6 md:flex">
          <aside className="mb-8 shrink-0 md:mb-0 md:w-56">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.common.backOffice}
            </p>
            <nav className="mt-2 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
