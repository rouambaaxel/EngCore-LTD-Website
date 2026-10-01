"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { startPayment, type PaymentActionState } from "@/lib/actions/payment";
import type { BankAccount, Currency } from "@/lib/payments/config";
import type { Locale } from "@/lib/i18n/config";
import type { PaymentMethod } from "@/lib/types";

export interface PaymentLabels {
  choose: string;
  card: string;
  cardHint: string;
  transfer: string;
  transferHint: string;
  currency: string;
  converted: string;
  rateNote: string;
  amountInBase: string;
  pay: string;
  submitting: string;
  unavailable: string;
  transferTitle: string;
  transferIntro: string;
  transferAccount: string;
  accountName: string;
  bankName: string;
  iban: string;
  swift: string;
  bankAddress: string;
  transferReference: string;
  transferPending: string;
}

/** Contre-valeur déjà calculée côté serveur, une par devise proposable. */
export interface QuotedCurrency {
  currency: Currency;
  amount: number;
  marginPercent: number;
  /** Absent si le taux n'a pas pu être obtenu : la devise est alors écartée. */
  unavailable?: boolean;
}

function PayButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Choix du moyen de règlement et de la devise.
 *
 * Le devis est libellé en livres. Le client peut s'acquitter en euro ou en
 * dollar : la contre-valeur est calculée côté serveur et affichée avant
 * l'engagement, marge de change comprise. Rien n'est laissé à deviner.
 */
export default function PaymentPanel({
  orderId,
  locale,
  methods,
  accounts,
  quotes,
  baseAmountLabel,
  transferReference,
  hasPendingTransfer,
  formatAmount,
  labels,
}: {
  orderId: string;
  locale: Locale;
  methods: PaymentMethod[];
  accounts: BankAccount[];
  quotes: QuotedCurrency[];
  baseAmountLabel: string;
  transferReference: string;
  hasPendingTransfer: boolean;
  /** Formatage monétaire, calculé côté serveur pour rester dans la langue. */
  formatAmount: Record<string, string>;
  labels: PaymentLabels;
}) {
  const [state, action] = useActionState<PaymentActionState, FormData>(startPayment, {
    error: null,
  });
  const [method, setMethod] = useState<PaymentMethod | null>(methods[0] ?? null);
  const [currency, setCurrency] = useState<Currency>("GBP");

  if (methods.length === 0) {
    return (
      <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {labels.unavailable}
      </p>
    );
  }

  const option: Record<PaymentMethod, { label: string; hint: string }> = {
    card: { label: labels.card, hint: labels.cardHint },
    transfer: { label: labels.transfer, hint: labels.transferHint },
  };

  // Le virement n'est possible que vers un compte ouvert ; la carte accepte
  // les trois devises.
  const allowed: Currency[] =
    method === "transfer"
      ? accounts.map((a) => a.currency)
      : quotes.filter((q) => !q.unavailable).map((q) => q.currency);

  const active = allowed.includes(currency) ? currency : (allowed[0] ?? "GBP");
  const quoted = quotes.find((q) => q.currency === active);
  const account = accounts.find((a) => a.currency === active);
  const showBank = method === "transfer" || hasPendingTransfer;

  return (
    <div className="mt-3">
      {state.error && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="currency" value={active} />

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {labels.choose}
          </legend>
          <div className="mt-2 space-y-2">
            {methods.map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                  method === value
                    ? "border-brand-orange bg-amber-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={method === value}
                  onChange={() => setMethod(value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {option[value].label}
                  </span>
                  <span className="block text-xs text-slate-500">{option[value].hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {allowed.length > 1 && (
          <fieldset className="mt-4">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {labels.currency}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {allowed.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCurrency(value)}
                  className={`inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-semibold transition ${
                    active === value
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{labels.amountInBase}</span>
            <span className="font-semibold text-slate-900">{baseAmountLabel}</span>
          </div>
          {active !== "GBP" && quoted && (
            <>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">{labels.converted}</span>
                <span className="font-bold text-slate-900">
                  {formatAmount[active] ?? ""}
                </span>
              </div>
              <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                {labels.rateNote.replace("{m}", String(quoted.marginPercent))}
              </p>
            </>
          )}
        </div>

        <div className="mt-4">
          <PayButton label={labels.pay} pendingLabel={labels.submitting} />
        </div>
      </form>

      {showBank && account && (
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">{labels.transferTitle}</h3>
          <p className="mt-1 text-xs text-slate-600">{labels.transferIntro}</p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            {labels.transferAccount} — {account.currency}
          </p>

          <dl className="mt-1 space-y-1 text-sm">
            <Row label={labels.accountName} value={account.accountName} />
            {account.bankName && <Row label={labels.bankName} value={account.bankName} />}
            <Row label={labels.iban} value={account.iban} mono />
            <Row label={labels.swift} value={account.swift} mono />
            {account.address && <Row label={labels.bankAddress} value={account.address} />}
          </dl>

          <p className="mt-3 rounded border border-brand-orange bg-amber-50 px-3 py-2 text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              {labels.transferReference}
            </span>
            <span className="font-mono font-bold text-slate-900">{transferReference}</span>
          </p>

          {hasPendingTransfer && (
            <p className="mt-3 text-xs text-slate-600">{labels.transferPending}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "font-mono text-slate-900" : "text-slate-900"}>{value}</dd>
    </div>
  );
}
