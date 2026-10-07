"use client";

import { useActionState } from "react";
import { completePasswordReset, type PasswordActionState } from "@/lib/actions/password";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const initialState: PasswordActionState = { error: null, success: false };

export default function ResetPasswordForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(completePasswordReset, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label htmlFor="new_password" className="block text-sm font-medium text-slate-700">
          {t.auth.newPassword}
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
        <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-700">
          {t.auth.confirmPassword}
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.auth.newPasswordPending : t.auth.newPasswordSubmit}
      </button>
    </form>
  );
}
