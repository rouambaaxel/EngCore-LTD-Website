import Link from "next/link";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function MotDePasseOubliePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lien?: string }>;
}) {
  const { locale: raw } = await params;
  const { lien } = await searchParams;

  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t.auth.forgotTitle}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.auth.forgotIntro}</p>

      {/* Retour d'un lien expiré, déjà utilisé ou ouvert dans un autre navigateur. */}
      {lien === "invalide" && (
        <p className="mt-4 rounded-md border border-brand-orange/50 bg-amber-50 px-3 py-2 text-sm text-brand-navy">
          {t.auth.forgotLinkInvalid}
        </p>
      )}

      <div className="mt-6">
        <ForgotPasswordForm locale={locale} t={t} />
      </div>

      <p className="mt-6 text-center text-sm">
        <Link
          href={localePath(locale, "/connexion")}
          className="font-medium text-brand-blue hover:underline"
        >
          {t.auth.backToSignIn}
        </Link>
      </p>
    </div>
  );
}
