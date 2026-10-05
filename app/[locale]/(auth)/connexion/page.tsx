import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { pendingClaimTokens } from "@/lib/quotes/claim";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function ConnexionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; confirmation?: string }>;
}) {
  const { locale: raw } = await params;
  const { next, confirmation } = await searchParams;

  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  // Un client déjà inscrit peut avoir composé sa demande déconnecté : elle le
  // rejoindra à la connexion, autant le lui dire.
  const waiting = (await pendingClaimTokens()).length > 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t.auth.signInTitle}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.auth.signInIntro}</p>

      {/* Arrivée d'une inscription qui attend la confirmation par email. */}
      {confirmation && (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {t.auth.confirmSent}
        </p>
      )}

      {waiting && (
        <p className="mt-4 rounded-md border border-brand-orange/50 bg-amber-50 px-3 py-2 text-sm text-brand-navy">
          {t.quoteHold.keep}
        </p>
      )}

      <div className="mt-6">
        <LoginForm
          next={next ?? localePath(locale, "/compte")}
          locale={locale}
          t={t}
        />
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t.auth.noAccount}{" "}
        <Link
          href={localePath(locale, "/inscription")}
          className="font-medium text-brand-blue hover:underline"
        >
          {t.common.signUp}
        </Link>
      </p>
    </div>
  );
}
