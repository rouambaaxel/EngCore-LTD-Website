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

export interface HandoffLabels {
  title: string;
  intro: string;
  recipient: string;
  trackingLink: string;
  accessLink: string;
  accessIntro: string;
  create: string;
  creating: string;
  copyTracking: string;
  copyAccess: string;
  copied: string;
  openMail: string;
  mailSubject: string;
  /** `{numero}`, `{suivi}` et `{acces}` sont remplacés. */
  mailBody: string;
  pendingInvitation: string;
}

function CopyButton({ value, label, copiedLabel }: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // Presse-papiers refusé : le lien reste affiché, sélectionnable.
          setCopied(false);
        }
      }}
      className="inline-flex min-h-10 items-center rounded-md border border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-white"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

/**
 * Ce qu'on envoie au destinataire d'une commande sans compte.
 *
 * Deux liens, et la distinction compte : le suivi se consulte avec le numéro
 * seul, le reste — lignes, montants, règlement — exige un espace client. Les
 * présenter ensemble évite d'envoyer le mauvais, ou d'oublier le second.
 */
export default function GuestOrderHandoff({
  locale,
  orderNumber,
  trackingUrl,
  guestEmail,
  guestCompany,
  guestName,
  existingInvitationLink,
  labels,
}: {
  locale: Locale;
  orderNumber: string;
  trackingUrl: string;
  guestEmail: string;
  guestCompany: string | null;
  guestName: string | null;
  /** Lien déjà créé lors d'un passage précédent, s'il court toujours. */
  existingInvitationLink: string | null;
  labels: HandoffLabels;
}) {
  const [state, action, pending] = useActionState(createInvitation, initialState);
  const accessLink = state.link ?? existingInvitationLink;

  const mailHref = `mailto:${encodeURIComponent(guestEmail)}?subject=${encodeURIComponent(
    labels.mailSubject.replace("{numero}", orderNumber),
  )}&body=${encodeURIComponent(
    labels.mailBody
      .replace("{numero}", orderNumber)
      .replace("{suivi}", trackingUrl)
      .replace("{acces}", accessLink ?? ""),
  )}`;

  return (
    <section className="mt-6 rounded-lg border border-brand-orange/50 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-slate-900">{labels.title}</h2>
      <p className="mt-1 text-sm text-slate-700">{labels.intro}</p>

      <p className="mt-3 text-xs text-slate-600">
        <span className="font-semibold">{labels.recipient} : </span>
        {[guestCompany, guestName, guestEmail].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {labels.trackingLink}
        </p>
        <p className="mt-1 break-all rounded border border-brand-orange/40 bg-white px-3 py-2 font-mono text-xs text-slate-700">
          {trackingUrl}
        </p>
        <div className="mt-2">
          <CopyButton
            value={trackingUrl}
            label={labels.copyTracking}
            copiedLabel={labels.copied}
          />
        </div>
      </div>

      <div className="mt-5 border-t border-brand-orange/30 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {labels.accessLink}
        </p>
        <p className="mt-1 text-sm text-slate-700">{labels.accessIntro}</p>

        {accessLink ? (
          <>
            <p className="mt-2 break-all rounded border border-brand-orange/40 bg-white px-3 py-2 font-mono text-xs text-slate-700">
              {accessLink}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <CopyButton
                value={accessLink}
                label={labels.copyAccess}
                copiedLabel={labels.copied}
              />
              <a
                href={mailHref}
                className="inline-flex min-h-10 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
              >
                {labels.openMail}
              </a>
            </div>
          </>
        ) : (
          <form action={action} className="mt-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="email" value={guestEmail} />
            <input type="hidden" name="company_name" value={guestCompany ?? ""} />
            <input type="hidden" name="contact_name" value={guestName ?? ""} />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
            >
              {pending ? labels.creating : labels.create}
            </button>
          </form>
        )}

        {state.error && (
          <p className="mt-2 rounded border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            {/*
              Le cas le plus fréquent : une invitation court déjà pour cette
              adresse, créée depuis l'écran des invitations. Le message de
              l'action le dit, et renvoie là où le lien se retrouve.
            */}
            {state.error} {labels.pendingInvitation}
          </p>
        )}
      </div>
    </section>
  );
}
