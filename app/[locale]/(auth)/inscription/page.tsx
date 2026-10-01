import Link from "next/link";
import SignupForm from "@/components/SignupForm";
import { pendingClaimTokens } from "@/lib/quotes/claim";
import { getInvitation } from "@/lib/invitations";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export default async function InscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invitation?: string }>;
}) {
  const { locale: raw } = await params;
  const { invitation: token } = await searchParams;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const invitation = token ? await getInvitation(token) : null;

  // Une demande composée avant l'inscription attend ici. Le rappeler donne son
  // sens au formulaire : ce n'est pas une formalité de plus, c'est ce qui rend
  // la réponse possible.
  const waiting = (await pendingClaimTokens()).length > 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t.auth.signUpTitle}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.auth.signUpIntro}</p>

      {/*
        Invité par nos soins : le compte sera ouvert sans passer par l'écran
        d'attente. Le dire évite de faire craindre un délai qui n'aura pas lieu.
      */}
      {invitation && (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {t.auth.invitedNotice}
        </p>
      )}

      {waiting && (
        <p className="mt-4 rounded-md border border-brand-orange/50 bg-amber-50 px-3 py-2 text-sm text-brand-navy">
          {t.quoteHold.notice}
        </p>
      )}

      <div className="mt-6">
        <SignupForm locale={locale} t={t} invitation={invitation} />
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
