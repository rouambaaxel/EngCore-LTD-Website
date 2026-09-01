"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileActionState } from "@/lib/actions/profile";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { Profile } from "@/lib/types";

const initialState: ProfileActionState = { error: null, success: false };

export default function ProfileForm({
  profile,
  locale,
  t,
}: {
  profile: Profile;
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form action={formAction} className="mt-6 max-w-lg space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-slate-700">
          {t.auth.company}
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          defaultValue={profile.company_name ?? ""}
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
          defaultValue={profile.contact_name ?? ""}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          {t.auth.phone}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-slate-700">
          {t.account.address}
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={profile.address ?? ""}
          className={field}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-700">{t.account.profileUpdated}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.account.saving : t.account.save}
      </button>
    </form>
  );
}
