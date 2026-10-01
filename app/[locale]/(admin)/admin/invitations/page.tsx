import InvitationForm from "@/components/InvitationForm";
import { revokeInvitation } from "@/lib/actions/admin/invitations";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";

interface InvitationRow {
  id: string;
  email: string;
  company_name: string | null;
  contact_name: string | null;
  note: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

/** Quatre issues possibles, dans l'ordre où elles priment l'une sur l'autre. */
function stateOf(invitation: InvitationRow) {
  if (invitation.accepted_at) return "accepted" as const;
  if (invitation.revoked_at) return "revoked" as const;
  if (new Date(invitation.expires_at) <= new Date()) return "expired" as const;
  return "pending" as const;
}

export default async function AdminInvitationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from("account_invitations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<InvitationRow[]>();

  const invitations = data ?? [];

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(
      new Date(iso),
    );

  const tone = {
    pending: "border-brand-orange bg-amber-50 text-brand-navy",
    accepted: "border-emerald-300 bg-emerald-50 text-emerald-800",
    expired: "border-slate-300 bg-slate-100 text-slate-600",
    revoked: "border-red-200 bg-red-50 text-red-800",
  };

  const label = {
    pending: t.admin.inviteStatePending,
    accepted: t.admin.inviteStateAccepted,
    expired: t.admin.inviteStateExpired,
    revoked: t.admin.inviteStateRevoked,
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.invitations}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.admin.inviteIntro}</p>

      <div className="mt-6">
        <InvitationForm
          locale={locale}
          labels={{
            email: t.admin.inviteEmail,
            company: t.admin.inviteCompany,
            contact: t.admin.inviteContact,
            note: t.admin.inviteNote,
            notePlaceholder: t.admin.inviteNotePlaceholder,
            submit: t.admin.inviteSubmit,
            sending: t.admin.saving,
            readyTitle: t.admin.inviteReadyTitle,
            readyText: t.admin.inviteReadyText,
            copy: t.admin.inviteCopy,
            copied: t.admin.inviteCopied,
            openMail: t.admin.inviteOpenMail,
            mailSubject: t.admin.inviteMailSubject,
            mailBody: t.admin.inviteMailBody,
          }}
        />
      </div>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t.admin.inviteSent}
      </h2>

      {invitations.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t.admin.inviteNone}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {invitations.map((invitation) => {
            const state = stateOf(invitation);
            return (
              <li
                key={invitation.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{invitation.email}</p>
                  <p className="text-xs text-slate-500">
                    {[invitation.company_name, invitation.contact_name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t.admin.inviteCreatedOn} {formatDate(invitation.created_at)}
                    {state === "pending" &&
                      ` · ${t.admin.inviteExpiresOn} ${formatDate(invitation.expires_at)}`}
                    {state === "accepted" &&
                      invitation.accepted_at &&
                      ` · ${t.admin.inviteAcceptedOn} ${formatDate(invitation.accepted_at)}`}
                  </p>
                  {invitation.note && (
                    <p className="mt-1 text-xs italic text-slate-500">{invitation.note}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${tone[state]}`}
                  >
                    {label[state]}
                  </span>
                  {state === "pending" && (
                    <form action={revokeInvitation}>
                      <input type="hidden" name="id" value={invitation.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        {t.admin.inviteRevoke}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
