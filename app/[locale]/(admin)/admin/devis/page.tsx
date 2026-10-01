import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { convertQuoteToOrder } from "@/lib/actions/admin/quotes";
import QuoteStatusBadge from "@/components/QuoteStatusBadge";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";
import type { QuoteRequest } from "@/lib/types";

async function getQuoteRequests(): Promise<QuoteRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quote_requests")
    .select("*, product:products(*), items:quote_request_items(*, product:products(*))")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminDevisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const quotes = await getQuoteRequests();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t.admin.quotes}</h1>

      <div className="mt-6 space-y-4">
        {quotes.map((quote) => (
          <div key={quote.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {quote.reference && (
                  <p className="font-mono text-xs font-semibold text-slate-500">
                    {quote.reference}
                  </p>
                )}
                <p className="font-medium text-slate-900">
                  {quote.full_name ?? t.admin.anonymous}
                  {quote.company_name ? ` — ${quote.company_name}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  {quote.email}
                  {quote.phone ? ` · ${quote.phone}` : ""}
                </p>
                {quote.product && (
                  <p className="mt-1 text-xs font-medium text-brand-blue">
                    {t.admin.product} : {quote.product.name}
                  </p>
                )}
              </div>
              <QuoteStatusBadge status={quote.status} locale={locale} />
            </div>

            {quote.items && quote.items.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
                {quote.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-slate-700">
                      {item.product?.name ?? item.free_text_reference ?? t.account.item}
                      {item.product?.reference && (
                        <span className="ml-2 text-xs text-slate-500">
                          {t.common.reference} {item.product.reference}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-600">
                      × {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {quote.message && (
              <p className="mt-3 text-sm text-slate-700">{quote.message}</p>
            )}

            <p className="mt-2 text-xs text-slate-400">
              {t.admin.receivedOn}{" "}
              {new Date(quote.created_at).toLocaleString(INTL_LOCALE[locale])}
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href={p(`/admin/devis/${quote.id}`)}
                className="text-sm font-medium text-brand-blue hover:underline"
              >
                {t.admin.quoteDetail} →
              </Link>

              {quote.status !== "converti" &&
                (quote.client_id ? (
                  <form action={convertQuoteToOrder}>
                    <input type="hidden" name="id" value={quote.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="text-sm font-medium text-green-700 hover:underline">
                      {t.admin.convertToOrder}
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-slate-400">{t.admin.clientNotRegistered}</p>
                ))}
            </div>
          </div>
        ))}

        {quotes.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {t.admin.noQuotes}
          </p>
        )}
      </div>
    </div>
  );
}
