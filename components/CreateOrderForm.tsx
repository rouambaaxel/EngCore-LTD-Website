"use client";

import { useActionState } from "react";
import { createOrder, type OrderActionState } from "@/lib/actions/admin/orders";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { Profile } from "@/lib/types";

const initialState: OrderActionState = { error: null };

export default function CreateOrderForm({
  clients,
  locale,
  t,
}: {
  clients: Profile[];
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(createOrder, initialState);
  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <form action={formAction} className="mt-6 max-w-lg space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-slate-700">
          {t.admin.client} *
        </label>
        <select id="client_id" name="client_id" required className={field}>
          <option value="">{t.admin.selectClient}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.company_name ?? client.contact_name ?? client.id}
            </option>
          ))}
        </select>
        {clients.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">{t.admin.noClients}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          {t.admin.internalNotes}
        </label>
        <textarea id="notes" name="notes" rows={3} className={field} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || clients.length === 0}
        className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.admin.creating : t.admin.createOrder}
      </button>
    </form>
  );
}
