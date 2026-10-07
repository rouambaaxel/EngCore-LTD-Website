import Link from "next/link";
import { cookies } from "next/headers";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { getSessionUser } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function NouveauMotDePassePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  // Même contrôle que l'action : sans marque valide, inutile de laisser
  // saisir un mot de passe qui serait refusé à l'envoi.
  const marker = (await cookies()).get(RECOVERY_COOKIE)?.value;
  const user = await getSessionUser();
  const allowed = Boolean(user && marker && marker === user.id);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t.auth.newPasswordTitle}</h1>

      {allowed ? (
        <>
          <p className="mt-1 text-sm text-slate-600">{t.auth.newPasswordIntro}</p>
          <div className="mt-6">
            <ResetPasswordForm locale={locale} t={t} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 rounded-md border border-brand-orange/50 bg-amber-50 px-3 py-2 text-sm text-brand-navy">
            {t.auth.newPasswordExpired}
          </p>
          <p className="mt-6 text-center text-sm">
            <Link
              href={localePath(locale, "/mot-de-passe-oublie")}
              className="font-medium text-brand-blue hover:underline"
            >
              {t.auth.requestAgain}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
