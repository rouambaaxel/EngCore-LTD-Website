"use client";

import { useActionState, useState } from "react";
import { createOrder, type OrderActionState } from "@/lib/actions/admin/orders";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { Profile } from "@/lib/types";

const initialState: OrderActionState = { error: null };

/**
 * Saisie d'une commande, pour un compte client ou pour un destinataire qui
 * n'en a pas.
 *
 * Les deux cas s'excluent, d'où le choix en tête : afficher les deux blocs
 * ensemble laisserait croire qu'on peut remplir les deux, et poserait la
 * question de celui qui gagne.
 */
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
  const [recipient, setRecipient] = useState<"account" | "guest">(
    clients.length === 0 ? "guest" : "account",
  );

  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

  const choice = (value: "account" | "guest", label: string, hint: string) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
        recipient === value
          ? "border-brand-navy bg-slate-50"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name="recipient"
        value={value}
        checked={recipient === value}
        onChange={() => setRecipient(value)}
        className="mt-0.5"
      />
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-600">{hint}</span>
      </span>
    </label>
  );

  return (
    <form action={formAction} className="mt-6 max-w-lg space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.admin.recipient}
        </legend>
        {choice("account", t.admin.recipientAccount, t.admin.recipientAccountHint)}
        {choice("guest", t.admin.recipientGuest, t.admin.recipientGuestHint)}
      </fieldset>

      {recipient === "account" ? (
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-slate-700">
            {t.admin.client} *
          </label>
          <select id="client_id" name="client_id" className={field}>
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
      ) : (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {t.admin.guestEmail} *
            </span>
            <input type="email" name="guest_email" className={field} />
            <span className="mt-1 block text-xs text-slate-500">
              {t.admin.guestEmailHint}
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {t.admin.guestCompany}
              </span>
              <input type="text" name="guest_company" className={field} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{t.admin.guestName}</span>
              <input type="text" name="guest_name" className={field} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">{t.admin.guestPhone}</span>
            <input type="tel" name="guest_phone" className={field} />
          </label>
        </div>
      )}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          {t.admin.internalNotes}
        </label>
        <textarea id="notes" name="notes" rows={3} className={field} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-60"
      >
        {pending ? t.admin.creating : t.admin.createOrder}
      </button>
    </form>
  );
}
