"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { priceAndSendQuote, type QuoteActionState } from "@/lib/actions/admin/quotes";
import type { Locale } from "@/lib/i18n/config";

export interface PricingLine {
  id: string;
  designation: string;
  reference: string | null;
  quantity: number;
  unitPrice: number | null;
  label: string | null;
}

interface Labels {
  priceLines: string;
  lineLabel: string;
  unitPrice: string;
  quantity: string;
  shippingCost: string;
  vatRate: string;
  validUntil: string;
  replyMessage: string;
  send: string;
  sending: string;
  subtotal: string;
  shipping: string;
  vat: string;
  total: string;
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
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
 * Chiffrage d'un devis.
 *
 * Le total se recalcule à la saisie : l'administrateur voit ce que verra le
 * client avant d'envoyer, plutôt que de découvrir un arrondi surprenant après
 * coup. Le calcul reste identique à celui de `lib/money.ts` et à la fonction
 * SQL qui contrôlera le paiement.
 */
export default function QuotePricingForm({
  quoteId,
  locale,
  currency,
  lines,
  defaults,
  labels,
}: {
  quoteId: string;
  locale: Locale;
  currency: string;
  lines: PricingLine[];
  defaults: {
    shipping: number;
    vatRate: number;
    validUntil: string;
    replyMessage: string;
  };
  labels: Labels;
}) {
  const [state, action] = useActionState<QuoteActionState, FormData>(priceAndSendQuote, {
    error: null,
  });

  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, l.unitPrice != null ? String(l.unitPrice) : ""])),
  );
  const [shipping, setShipping] = useState(String(defaults.shipping || ""));
  const [vatRate, setVatRate] = useState(String(defaults.vatRate || ""));

  const num = (raw: string) => {
    const value = Number(raw.replace(",", "."));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * num(prices[l.id] ?? ""), 0);
  const net = subtotal + num(shipping);
  const total = Math.round(net * (1 + num(vatRate) / 100) * 100) / 100;
  const money = (amount: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", {
      style: "currency",
      currency,
    }).format(amount);

  const field =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="id" value={quoteId} />
      <input type="hidden" name="locale" value={locale} />

      {state.error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {labels.priceLines}
      </h2>

      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">{labels.lineLabel}</th>
              <th className="w-16 px-3 py-2 text-right font-semibold">{labels.quantity}</th>
              <th className="w-40 px-3 py-2 text-right font-semibold">{labels.unitPrice}</th>
              <th className="w-32 px-3 py-2 text-right font-semibold">{labels.total}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-3 py-2">
                  {line.reference ? (
                    <>
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {line.reference}
                      </span>
                      <span className="block text-xs text-slate-500">{line.designation}</span>
                    </>
                  ) : (
                    <input
                      type="text"
                      name={`label_${line.id}`}
                      defaultValue={line.label ?? line.designation}
                      aria-label={labels.lineLabel}
                      className={field}
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    name={`price_${line.id}`}
                    value={prices[line.id] ?? ""}
                    onChange={(event) =>
                      setPrices((current) => ({ ...current, [line.id]: event.target.value }))
                    }
                    aria-label={labels.unitPrice}
                    className={`${field} text-right`}
                    required
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {money(line.quantity * num(prices[line.id] ?? ""))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {labels.shippingCost}
          </span>
          <input
            type="text"
            inputMode="decimal"
            name="shipping_amount"
            value={shipping}
            onChange={(event) => setShipping(event.target.value)}
            className={`${field} mt-1`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {labels.vatRate}
          </span>
          <input
            type="text"
            inputMode="decimal"
            name="vat_rate"
            value={vatRate}
            onChange={(event) => setVatRate(event.target.value)}
            className={`${field} mt-1`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {labels.validUntil}
          </span>
          <input
            type="date"
            name="valid_until"
            defaultValue={defaults.validUntil}
            className={`${field} mt-1`}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {labels.replyMessage}
        </span>
        <textarea
          name="reply_message"
          rows={4}
          defaultValue={defaults.replyMessage}
          className={`${field} mt-1`}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex gap-6">
            <dt className="w-28 text-slate-600">{labels.subtotal}</dt>
            <dd className="tabular-nums">{money(subtotal)}</dd>
          </div>
          <div className="flex gap-6">
            <dt className="w-28 text-slate-600">{labels.shipping}</dt>
            <dd className="tabular-nums">{money(num(shipping))}</dd>
          </div>
          <div className="flex gap-6">
            <dt className="w-28 text-slate-600">
              {labels.vat} ({num(vatRate)}%)
            </dt>
            <dd className="tabular-nums">{money(total - Math.round(net * 100) / 100)}</dd>
          </div>
          <div className="flex gap-6 border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
            <dt className="w-28">{labels.total}</dt>
            <dd className="tabular-nums">{money(total)}</dd>
          </div>
        </dl>

        <SubmitButton label={labels.send} pendingLabel={labels.sending} />
      </div>
    </form>
  );
}
