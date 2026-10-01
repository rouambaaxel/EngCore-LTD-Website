"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  acceptQuote,
  declineQuote,
  requestQuoteAmendment,
  type QuoteResponseState,
} from "@/lib/actions/quote-response";
import type { Locale } from "@/lib/i18n/config";

interface Labels {
  accept: string;
  amend: string;
  amendTitle: string;
  amendPlaceholder: string;
  decline: string;
  declineReason: string;
}

type Panel = "none" | "amend" | "decline";

function SubmitButton({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {label}
    </button>
  );
}

/**
 * Réponse du client à un devis traité.
 *
 * Trois issues, et non deux : accepter, demander une révision, refuser. La
 * révision est mise en avant à côté de l'acceptation — c'est la réponse la
 * plus fréquente en négoce, et l'enterrer derrière un refus pousserait à
 * rompre une discussion qui pouvait aboutir.
 */
export default function QuoteResponseForm({
  quoteId,
  locale,
  labels,
}: {
  quoteId: string;
  locale: Locale;
  labels: Labels;
}) {
  const initial: QuoteResponseState = { error: null };
  const [acceptState, acceptAction] = useActionState(acceptQuote, initial);
  const [amendState, amendAction] = useActionState(requestQuoteAmendment, initial);
  const [declineState, declineAction] = useActionState(declineQuote, initial);
  const [panel, setPanel] = useState<Panel>("none");

  const error = acceptState.error ?? amendState.error ?? declineState.error;

  const hidden = (
    <>
      <input type="hidden" name="id" value={quoteId} />
      <input type="hidden" name="locale" value={locale} />
    </>
  );

  const textarea =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <div className="mt-6 rounded-lg border border-brand-orange/40 bg-amber-50 p-4">
      {error && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form action={acceptAction}>
          {hidden}
          <SubmitButton
            label={labels.accept}
            className="inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue"
          />
        </form>

        <button
          type="button"
          onClick={() => setPanel(panel === "amend" ? "none" : "amend")}
          className="inline-flex min-h-11 items-center rounded-md border border-brand-navy bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
        >
          {labels.amend}
        </button>

        <button
          type="button"
          onClick={() => setPanel(panel === "decline" ? "none" : "decline")}
          className="inline-flex min-h-11 items-center px-2 text-sm text-slate-500 hover:text-slate-800"
        >
          {labels.decline}
        </button>
      </div>

      {panel === "amend" && (
        <form action={amendAction} className="mt-4 border-t border-brand-orange/30 pt-4">
          {hidden}
          <label
            htmlFor="amend-body"
            className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            {labels.amendTitle}
          </label>
          <textarea
            id="amend-body"
            name="body"
            rows={4}
            required
            placeholder={labels.amendPlaceholder}
            className={textarea}
          />
          <div className="mt-3">
            <SubmitButton
              label={labels.amend}
              className="inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue"
            />
          </div>
        </form>
      )}

      {panel === "decline" && (
        <form action={declineAction} className="mt-4 border-t border-brand-orange/30 pt-4">
          {hidden}
          <label
            htmlFor="decline-reason"
            className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            {labels.declineReason}
          </label>
          <textarea id="decline-reason" name="reason" rows={3} className={textarea} />
          <div className="mt-3">
            <SubmitButton
              label={labels.decline}
              className="inline-flex min-h-11 items-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
            />
          </div>
        </form>
      )}
    </div>
  );
}
