"use client";

import { useActionState } from "react";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const initialState: AuthActionState = { error: null };

export default function SignupForm({
  locale,
  t,
  invitation,
}: {
  locale: Locale;
  t: Dictionary;
  /** Renseigné quand on arrive par un lien d'invitation valide. */
  invitation?: {
    token: string;
    email: string;
    companyName: string | null;
    contactName: string | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {invitation && <input type="hidden" name="invitation" value={invitation.token} />}

      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-slate-700">
          {t.auth.company}
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          required
          defaultValue={invitation?.companyName ?? ""}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="contact_name" className="block text-sm font-medium text-slate-700">
          {t.auth.contactName}
        </label>
        <input
          id="contact_name"
          name="contact_name"
          type="text"
          required
          defaultValue={invitation?.contactName ?? ""}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          {t.auth.phone}
        </label>
        <input id="phone" name="phone" type="tel" className={field} />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          {t.auth.email}
        </label>
        {/*
          L'invitation vaut pour une adresse et une seule — la fonction
          `accept_invitation` le revérifie côté base. Laisser le champ
          modifiable ne ferait qu'offrir une inscription qui échoue à se
          faire valider.
        */}
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={invitation?.email ?? ""}
          readOnly={Boolean(invitation)}
          className={`${field} ${invitation ? "bg-slate-50 text-slate-600" : ""}`}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className={field}
        />
        <p className="mt-1 text-xs text-slate-500">{t.auth.passwordHint}</p>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.auth.signUpPending : t.auth.signUpSubmit}
      </button>
    </form>
  );
}
