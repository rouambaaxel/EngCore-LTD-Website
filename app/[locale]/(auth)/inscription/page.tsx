import Link from "next/link";
import SignupForm from "@/components/SignupForm";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function InscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t.auth.signUpTitle}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.auth.signUpIntro}</p>
      <div className="mt-6">
        <SignupForm locale={locale} t={t} />
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t.auth.hasAccount}{" "}
        <Link
          href={localePath(locale, "/connexion")}
          className="font-medium text-brand-blue hover:underline"
        >
          {t.auth.signInSubmit}
        </Link>
      </p>
    </div>
  );
}
