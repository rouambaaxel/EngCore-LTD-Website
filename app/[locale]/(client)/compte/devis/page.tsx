import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuoteStatusBadge from "@/components/QuoteStatusBadge";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";
import { computeTotals, formatMoney } from "@/lib/money";
import type { QuoteStatus } from "@/lib/types";

interface QuoteRow {
  id: string;
  reference: string | null;
  status: QuoteStatus;
  created_at: string;
  currency: string;
  shipping_amount: number;
  vat_rate: number;
  valid_until: string | null;
  items: { quantity: number; unit_price: number | null }[] | null;
}

export default async function ClientQuotesPage({
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

  const { data: quotes } = await supabase
    .from("quote_requests")
    .select(
      "id, reference, status, created_at, currency, shipping_amount, vat_rate, valid_until, items:quote_request_items(quantity, unit_price)",
    )
    .eq("client_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .returns<QuoteRow[]>();

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(
      new Date(iso),
    );

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t.quotes.title}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.quotes.intro}</p>

      {!quotes || quotes.length === 0 ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{t.quotes.empty}</p>
          <Link
            href={p("/catalogue")}
            className="mt-4 inline-flex min-h-10 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.quotes.emptyCta}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {quotes.map((quote) => {
            // Le total ne s'affiche qu'une fois le devis chiffré : avant, il
            // vaudrait zéro et laisserait croire à une commande gratuite.
            const totals = computeTotals(
              quote.items ?? [],
              quote.shipping_amount,
              quote.vat_rate,
            );
            const priced = quote.status !== "nouveau" && !totals.incomplete;

            return (
              <li key={quote.id}>
                <Link
                  href={p(`/compte/devis/${quote.id}`)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-orange hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {quote.reference ?? t.quotes.reference}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.quotes.requestedOn} {formatDate(quote.created_at)}
                      {quote.valid_until && quote.status === "chiffre" && (
                        <>
                          {" · "}
                          {t.quotes.validUntil} {formatDate(quote.valid_until)}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {priced && (
                      <span className="text-sm font-semibold text-slate-900">
                        {formatMoney(totals.total, locale, quote.currency)}
                      </span>
                    )}
                    <QuoteStatusBadge status={quote.status} locale={locale} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
