"use client";

import { useActionState, useState } from "react";
import { createInvitation, type InvitationState } from "@/lib/actions/admin/invitations";
import type { Locale } from "@/lib/i18n/config";

const initialState: InvitationState = {
  error: null,
  link: null,
  email: null,
  sent: false,
  sendError: null,
};

export interface InvitationLabels {
  email: string;
  company: string;
  contact: string;
  note: string;
  notePlaceholder: string;
  submit: string;
  sending: string;
  readyTitle: string;
  readyText: string;
  copy: string;
  copied: string;
  openMail: string;
  mailSubject: string;
  /** `{lien}` est remplacé par l'adresse d'invitation. */
  mailBody: string;
  language: string;
  emailedTitle: string;
  /** `{email}` est remplacé par l'adresse invitée. */
  emailedText: string;
}

export default function InvitationForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: InvitationLabels;
}) {
  const [state, action, pending] = useActionState<InvitationState, FormData>(
    createInvitation,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  const mailHref =
    state.link && state.email
      ? `mailto:${encodeURIComponent(state.email)}?subject=${encodeURIComponent(
          labels.mailSubject,
        )}&body=${encodeURIComponent(labels.mailBody.replace("{lien}", state.link))}`
      : "";

  return (
    <div>
      <form action={action} className="rounded-lg border border-slate-200 bg-white p-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="send_email" value="1" />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-3">
            <span className="text-sm font-medium text-slate-700">{labels.email} *</span>
            <input type="email" name="email" required className={field} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{labels.company}</span>
            <input type="text" name="company_name" className={field} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{labels.contact}</span>
            <input type="text" name="contact_name" className={field} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{labels.language}</span>
            <select name="invite_locale" defaultValue={locale} className={field}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{labels.note}</span>
            <input
              type="text"
              name="note"
              placeholder={labels.notePlaceholder}
              className={field}
            />
          </label>
        </div>

        {state.error && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
        >
          {pending ? labels.sending : labels.submit}
        </button>
      </form>

      {state.link && (
        <section className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            {state.sent ? labels.emailedTitle : labels.readyTitle}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {state.sent
              ? labels.emailedText.replace("{email}", state.email ?? "")
              : labels.readyText}
          </p>

          {/* Envoi raté : l'invitation existe, l'administrateur prend le relais. */}
          {state.sendError && (
            <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-brand-navy">
              {state.sendError}
            </p>
          )}

          <p className="mt-3 break-all rounded border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
            {state.link}
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.link ?? "");
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                } catch {
                  // Presse-papiers refusé par le navigateur : le lien reste
                  // affiché au-dessus, sélectionnable à la main.
                  setCopied(false);
                }
              }}
              className="inline-flex min-h-10 items-center rounded-md border border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-white"
            >
              {copied ? labels.copied : labels.copy}
            </button>
            {/* Déjà parti de la boîte de la société : pas de second envoi à proposer. */}
            {!state.sent && (
              <a
                href={mailHref}
                className="inline-flex min-h-10 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
              >
                {labels.openMail}
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
