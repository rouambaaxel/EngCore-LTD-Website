"use client";

import { useActionState } from "react";
import { submitQuoteRequest, type QuoteActionState } from "@/lib/actions/quote";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const initialState: QuoteActionState = { error: null, success: false };

export default function QuoteRequestForm({
  productId,
  productLabel,
  locale,
  t,
}: {
  productId?: string;
  productLabel?: string;
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(submitQuoteRequest, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  if (state.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        {t.contact.success}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {productId && <input type="hidden" name="product_id" value={productId} />}

      {productLabel && (
        <p className="rounded-md bg-brand-blue/10 px-3 py-2 text-sm text-brand-blue">
          {t.contact.quoteFor} <strong>{productLabel}</strong>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
            {t.contact.name}
          </label>
          <input id="full_name" name="full_name" type="text" className={field} />
        </div>
        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-slate-700">
            {t.contact.company}
          </label>
          <input id="company_name" name="company_name" type="text" className={field} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            {t.contact.email} *
          </label>
          <input id="email" name="email" type="email" required className={field} />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            {t.contact.phone}
          </label>
          <input id="phone" name="phone" type="tel" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700">
          {t.contact.message} *
        </label>
        <textarea id="message" name="message" required rows={4} className={field} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.contact.submitting : t.contact.submit}
      </button>
    </form>
  );
}
