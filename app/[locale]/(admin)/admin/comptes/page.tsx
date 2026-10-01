import { createClient } from "@/lib/supabase/server";
import { approveAccount, rejectAccount } from "@/lib/actions/admin/accounts";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import type { AccountStatus } from "@/lib/types";

interface AccountRow {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  role: string;
  status: AccountStatus;
  rejection_reason: string | null;
  created_at: string;
}

const TONE: Record<AccountStatus, string> = {
  pending: "border-brand-orange bg-amber-50 text-brand-navy",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

function StatusBadge({ status, locale }: { status: AccountStatus; locale: Locale }) {
  const t = getDictionary(locale);
  const label: Record<AccountStatus, string> = {
    pending: t.admin.statusPending,
    approved: t.admin.statusApproved,
    rejected: t.admin.statusRejected,
  };
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${TONE[status]}`}
    >
      {label[status]}
    </span>
  );
}

export default async function AdminAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, company_name, contact_name, phone, role, status, rejection_reason, created_at")
    .order("created_at", { ascending: false })
    .returns<AccountRow[]>();

  const accounts = data ?? [];
  const pending = accounts.filter((a) => a.status === "pending");
  const handled = accounts.filter((a) => a.status !== "pending");

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(new Date(iso));

  const identity = (account: AccountRow) =>
    account.company_name ?? account.contact_name ?? account.id.slice(0, 8);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.accounts}</h1>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.admin.pendingAccounts}
        </h2>

        {pending.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {t.admin.noPendingAccounts}
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {pending.map((account) => (
              <li
                key={account.id}
                className="rounded-lg border border-brand-orange/40 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{identity(account)}</p>
                    <p className="text-xs text-slate-500">
                      {account.contact_name && `${t.admin.contactPerson} : ${account.contact_name}`}
                      {account.phone ? ` · ${account.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t.admin.signedUpOn} {formatDate(account.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={account.status} locale={locale} />
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <form action={approveAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
                    >
                      {t.admin.approve}
                    </button>
                  </form>

                  <form action={rejectAccount} className="flex flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={account.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <label className="min-w-48 flex-1">
                      <span className="sr-only">{t.admin.rejectReason}</span>
                      <input
                        type="text"
                        name="reason"
                        placeholder={t.admin.rejectReason}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                      />
                    </label>
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center rounded-md border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      {t.admin.reject}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.admin.otherAccounts}
        </h2>

        {handled.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {t.admin.noAccounts}
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">{t.admin.company}</th>
                  <th className="px-4 py-2 text-left font-semibold">{t.admin.signedUpOn}</th>
                  <th className="px-4 py-2 text-left font-semibold">{t.admin.status}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handled.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{identity(account)}</span>
                      {account.role === "admin" && (
                        <span className="ml-2 text-xs font-semibold uppercase text-brand-blue">
                          admin
                        </span>
                      )}
                      {account.rejection_reason && (
                        <span className="block text-xs text-slate-500">
                          « {account.rejection_reason} »
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(account.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={account.status} locale={locale} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Une décision se corrige : un compte refusé par erreur
                          doit pouvoir être ouvert sans repasser par la base. */}
                      {account.status === "rejected" && (
                        <form action={approveAccount}>
                          <input type="hidden" name="id" value={account.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="text-sm font-medium text-brand-blue hover:underline"
                          >
                            {t.admin.approve}
                          </button>
                        </form>
                      )}
                      {account.status === "approved" && account.role !== "admin" && (
                        <form action={rejectAccount}>
                          <input type="hidden" name="id" value={account.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="text-sm font-medium text-red-700 hover:underline"
                          >
                            {t.admin.reject}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
