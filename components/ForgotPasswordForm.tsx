"use client";

import { useActionState } from "react";
import { requestPasswordReset, type PasswordActionState } from "@/lib/actions/password";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const initialState: PasswordActionState = { error: null, success: false };

export default function ForgotPasswordForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  // Une fois le lien parti, le formulaire disparaît : le laisser inviterait à
  // renvoyer, et chaque envoi invalide le lien précédent.
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      >
        {t.auth.forgotSent}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          {t.auth.email}
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.auth.forgotPending : t.auth.forgotSubmit}
      </button>
    </form>
  );
}
