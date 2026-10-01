import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";

/**
 * Accusé de réception d'une demande déposée sans compte.
 *
 * Le ton importe : la demande est enregistrée, rien n'est à refaire. L'écran
 * n'annonce pas un refus mais une étape — l'ouverture du compte qui recevra le
 * chiffrage. Le numéro de demande est affiché parce qu'il rassure : le visiteur
 * peut nous en parler par téléphone avant même d'être inscrit.
 */
export default function QuoteHoldPanel({
  t,
  reference,
  signUpHref,
  signInHref,
}: {
  t: Dictionary;
  reference: string | null;
  signUpHref: string;
  signInHref: string;
}) {
  return (
    <div className="rounded-lg border border-brand-orange/50 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-brand-navy">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
            className="h-5 w-5"
          >
            <path d="m4 13 5 5L20 7" />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-slate-900">{t.quoteHold.title}</p>
          {reference && (
            <p className="mt-1 text-sm text-slate-700">
              {t.quoteHold.reference}{" "}
              <span className="font-mono font-semibold">{reference}</span>
            </p>
          )}
          <p className="mt-2 text-sm text-slate-700">{t.quoteHold.text}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={signUpHref}
          className="inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.quoteHold.signUp}
        </Link>
        <Link
          href={signInHref}
          className="inline-flex min-h-11 items-center rounded-md border border-brand-navy px-5 text-sm font-semibold text-brand-navy hover:bg-white"
        >
          {t.quoteHold.signIn}
        </Link>
      </div>

      <p className="mt-3 text-xs text-slate-600">{t.quoteHold.keep}</p>
    </div>
  );
}
