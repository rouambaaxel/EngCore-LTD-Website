"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const initialState: AuthActionState = { error: null };

export default function LoginForm({
  next,
  locale,
  t,
}: {
  next: string;
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          {t.auth.email}
        </label>
        <input id="email" name="email" type="email" required className={field} />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          {t.auth.password}
        </label>
        <input id="password" name="password" type="password" required className={field} />
        <p className="mt-1 text-right text-xs">
          <Link
            href={`/${locale}/mot-de-passe-oublie`}
            className="font-medium text-brand-blue hover:underline"
          >
            {t.auth.forgotLink}
          </Link>
        </p>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.auth.signInPending : t.auth.signInSubmit}
      </button>
    </form>
  );
}
