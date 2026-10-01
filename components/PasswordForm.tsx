"use client";

import { useActionState, useRef, useEffect } from "react";
import { updatePassword, type PasswordActionState } from "@/lib/actions/password";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const initialState: PasswordActionState = { error: null, success: false };

export default function PasswordForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const form = useRef<HTMLFormElement>(null);

  // Laisser trois mots de passe dans les champs après un changement réussi
  // n'a aucun usage, et les expose au prochain qui passe devant l'écran.
  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state.success]);

  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form ref={form} action={formAction} className="mt-6 max-w-lg space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label
          htmlFor="current_password"
          className="block text-sm font-medium text-slate-700"
        >
          {t.account.currentPassword}
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="new_password" className="block text-sm font-medium text-slate-700">
          {t.account.newPassword}
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
        />
        <p className="mt-1 text-xs text-slate-500">{t.auth.passwordHint}</p>
      </div>

      <div>
        <label
          htmlFor="confirm_password"
          className="block text-sm font-medium text-slate-700"
        >
          {t.account.confirmPassword}
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {t.account.passwordUpdated}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md border border-brand-navy px-5 text-sm font-semibold text-brand-navy hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? t.account.saving : t.account.changePassword}
      </button>
    </form>
  );
}
