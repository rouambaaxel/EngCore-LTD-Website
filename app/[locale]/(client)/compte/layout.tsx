import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function CompteLayout({
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

  if (!user) redirect(`${p("/connexion")}?next=${encodeURIComponent(p("/compte"))}`);

  const navLinks = [
    { href: p("/compte"), label: t.account.dashboard },
    { href: p("/compte/commandes"), label: t.account.myOrders },
    { href: p("/compte/profil"), label: t.account.myProfile },
  ];

  return (
    <>
      <Header locale={locale} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl gap-8 px-4 py-10 sm:px-6 md:flex">
          <aside className="mb-8 shrink-0 md:mb-0 md:w-56">
            <nav className="space-y-1">
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
