import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function ConnexionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  const { next } = await searchParams;

  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t.auth.signInTitle}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.auth.signInIntro}</p>
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
