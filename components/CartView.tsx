"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import QuoteHoldPanel from "@/components/QuoteHoldPanel";
import { submitCartQuote, type QuoteActionState } from "@/lib/actions/quote";
import { useCart } from "@/lib/cart/context";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { SignedInContact } from "@/lib/quotes/contact";

const initialState: QuoteActionState = { error: null, success: false };

export default function CartView({
  locale,
  t,
  catalogueHref,
  contact,
  signUpHref,
  signInHref,
}: {
  locale: Locale;
  t: Dictionary;
  catalogueHref: string;
  /** Renseigné quand le visiteur est connecté ; ses champs sont alors masqués. */
  contact?: SignedInContact | null;
  signUpHref: string;
  signInHref: string;
}) {
  const { lines, ready, setQuantity, remove, clear } = useCart();
  const [state, formAction, pending] = useActionState(submitCartQuote, initialState);

  // Le panier n'est vidé qu'une fois la demande enregistrée.
  useEffect(() => {
    if (state.success) clear();
  }, [state.success, clear]);

  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  // Déposée sans compte : le panier est bien vidé, la demande enregistrée, et
  // l'écran enchaîne sur l'inscription qui la rendra exploitable.
  if (state.success && state.requiresAccount) {
    return (
      <div className="mt-6">
        <QuoteHoldPanel
          t={t}
          reference={state.reference ?? null}
          signUpHref={signUpHref}
          signInHref={signInHref}
        />
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="mt-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {t.cart.success}
        </div>
        <Link
          href={catalogueHref}
          className="mt-4 inline-block rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.cart.successCta}
        </Link>
      </div>
    );
  }

  // Tant que localStorage n'est pas lu, on n'affiche rien : afficher « panier
  // vide » puis le remplacer produirait un clignotement.
  if (!ready) {
    return <p className="mt-6 text-sm text-slate-400">…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-6">
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t.cart.empty}
        </p>
        <Link
          href={catalogueHref}
          className="mt-4 inline-block rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.cart.emptyCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t.cart.lines}
      </h2>

      <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {lines.map((line) => (
          <li key={line.slug} className="flex flex-wrap items-center gap-4 px-3 py-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
              {line.imageUrl ? (
                <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                  {t.common.noPhoto}
                </div>
              )}
            </div>

            <div className="min-w-[12rem] flex-1">
              <p className="font-medium text-slate-900">{line.name}</p>
              <p className="text-xs text-slate-500">
                {t.common.reference} {line.reference}
                {line.brand && <span> · {line.brand}</span>}
              </p>
            </div>

            <div>
              <label
                htmlFor={`qty-${line.slug}`}
                className="block text-[11px] font-medium text-slate-500"
              >
                {t.cart.quantity}
              </label>
              <input
                id={`qty-${line.slug}`}
                type="number"
                min={1}
                max={9999}
                value={line.quantity}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  setQuantity(line.slug, Number.isFinite(parsed) ? parsed : 1);
                }}
                className="mt-0.5 w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => remove(line.slug)}
              className="text-sm text-red-600 hover:underline"
            >
              {t.cart.remove}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={clear}
        className="mt-3 text-xs text-slate-500 hover:text-red-600 hover:underline"
      >
        {t.cart.clear}
      </button>

      <form action={formAction} className="mt-8 max-w-2xl space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input
          type="hidden"
          name="lines"
          value={JSON.stringify(
            lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
          )}
        />

        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.cart.contactTitle}
        </h2>

        {contact ? (
          /*
            Connecté : redemander nom, société, email et téléphone n'apporte
            rien et invite à la faute de frappe. Le serveur lit de toute façon
            ces valeurs dans la session, pas dans ce formulaire.
          */
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">
              {contact.companyName ?? contact.contactName ?? contact.email}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {[contact.contactName, contact.email, contact.phone]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <a
              href={contact.accountHref}
              className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-brand-blue hover:underline"
            >
              {t.cart.editDetails}
            </a>
          </div>
        ) : (
          <>
            {/*
              Dit avant l'envoi, ce n'est pas une mauvaise surprise après :
              le visiteur sait où atterrira notre réponse, et qu'il n'a pas à
              s'inscrire pour composer sa demande.
            */}
            <p className="rounded-md border border-brand-orange/40 bg-amber-50 px-3 py-2 text-xs text-slate-700">
              {t.quoteHold.upfront}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
                  {t.contact.name}
                </label>
                <input id="full_name" name="full_name" type="text" className={field} />
              </div>
              <div>
                <label
                  htmlFor="company_name"
                  className="block text-sm font-medium text-slate-700"
                >
                  {t.contact.company}
                </label>
                <input id="company_name" name="company_name" type="text" className={field} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  {t.contact.email} *
                </label>
                <input id="email" name="email" type="email" required className={field} />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                  {t.contact.phone}
                </label>
                <input id="phone" name="phone" type="tel" className={field} />
              </div>
            </div>
          </>
        )}

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700">
            {t.contact.message}
          </label>
          <textarea id="message" name="message" rows={4} className={field} />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-orange px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-brand-yellow disabled:opacity-60"
        >
          {pending ? t.cart.submitting : t.cart.submit}
        </button>
      </form>
    </div>
  );
}
