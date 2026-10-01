import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

/**
 * Seule page accessible à un compte non validé. Le proxy y renvoie tant que la
 * validation n'est pas faite, et en ressort dès qu'elle l'est.
 */
export default async function AccountPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, rejection_reason, company_name")
    .eq("id", user?.id ?? "")
    .single<{
      status: string;
      rejection_reason: string | null;
      company_name: string | null;
    }>();

  const rejected = profile?.status === "rejected";

  // Une demande rattachée à l'inscription est souvent la raison même du compte.
  // Confirmer qu'elle est bien arrivée évite la crainte de l'avoir perdue en
  // chemin — l'espace où elle figure n'est pas encore accessible.
  const { count: quoteCount } = await supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user?.id ?? "");

  return (
    <div className="mx-auto max-w-2xl">
      <div
        className={`rounded-lg border p-8 ${
          rejected ? "border-red-200 bg-red-50" : "border-brand-orange/40 bg-amber-50"
        }`}
      >
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${
            rejected ? "bg-red-100 text-red-700" : "bg-brand-orange/20 text-brand-navy"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
            className="h-5 w-5"
          >
            {rejected ? (
              <path d="M12 8v5M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            ) : (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </>
            )}
          </svg>
        </span>

        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {rejected ? t.account.rejectedTitle : t.account.pendingTitle}
        </h1>

        {profile?.company_name && (
          <p className="mt-1 text-sm font-medium text-slate-600">{profile.company_name}</p>
        )}

        <p className="mt-4 text-sm text-slate-700">
          {rejected ? t.account.rejectedText : t.account.pendingText}
        </p>

        {rejected && profile?.rejection_reason && (
          <p className="mt-3 rounded border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            {profile.rejection_reason}
          </p>
        )}

        {!rejected && <p className="mt-3 text-sm text-slate-700">{t.account.pendingWhat}</p>}

        {!rejected && (quoteCount ?? 0) > 0 && (
          <p className="mt-3 rounded border border-brand-orange/40 bg-white px-3 py-2 text-sm text-brand-navy">
            {t.account.pendingQuotesAttached}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={p("/contact")}
            className="inline-flex min-h-10 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.account.pendingContact}
          </Link>
          <Link
            href={p("/catalogue")}
            className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-white"
          >
            {t.catalogue.title}
          </Link>
        </div>
      </div>
    </div>
  );
}
