import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteStatusBadge from "@/components/QuoteStatusBadge";
import QuoteResponseForm from "@/components/QuoteResponseForm";
import QuoteThread from "@/components/QuoteThread";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";
import { computeTotals, formatMoney } from "@/lib/money";
import type { QuoteMessage, QuoteStatus } from "@/lib/types";

interface QuoteDetail {
  id: string;
  reference: string | null;
  status: QuoteStatus;
  created_at: string;
  quoted_at: string | null;
  revision: number;
  valid_until: string | null;
  currency: string;
  shipping_amount: number;
  vat_rate: number;
  reply_message: string | null;
  decline_reason: string | null;
  message: string | null;
  items:
    | {
        id: string;
        quantity: number;
        unit_price: number | null;
        label: string | null;
        free_text_reference: string | null;
        product: { name: string; reference: string; slug: string } | null;
      }[]
    | null;
}

export default async function ClientQuoteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const supabase = await createClient();
  const { data: quote, error: quoteError } = await supabase
    .from("quote_requests")
    .select(
      "id, reference, status, created_at, quoted_at, valid_until, currency, shipping_amount, vat_rate, reply_message, decline_reason, message, items:quote_request_items(id, quantity, unit_price, label, free_text_reference, product:products(name, reference, slug))",
    )
    .eq("id", id)
    .maybeSingle<QuoteDetail>();

  if (!quote) {
    if (quoteError) console.error("[compte/devis]", quoteError);
    notFound();
  }

  const { data: messages } = await supabase
    .from("quote_messages")
    .select("*")
    .eq("quote_request_id", quote.id)
    .order("created_at")
    .returns<QuoteMessage[]>();

  // La commande née de ce devis, pour y renvoyer une fois converti.
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("quote_request_id", quote.id)
    .maybeSingle<{ id: string; order_number: string }>();

  const lines = quote.items ?? [];
  const totals = computeTotals(lines, quote.shipping_amount, quote.vat_rate);
  const priced = quote.status !== "nouveau" && !totals.incomplete;
  const expired =
    quote.valid_until !== null && new Date(quote.valid_until) < new Date(new Date().toDateString());
  const canRespond = quote.status === "chiffre" && !expired;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(new Date(iso));

  const money = (amount: number) => formatMoney(amount, locale, quote.currency);

  return (
    <div className="max-w-3xl">
      <Link href={p("/compte/devis")} className="text-sm text-brand-blue hover:underline">
        ← {t.quotes.title}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-xl font-bold text-slate-900">
          {quote.reference ?? t.quotes.reference}
          {quote.revision > 1 && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              {t.quotes.revision} {quote.revision}
            </span>
          )}
        </h1>
        <QuoteStatusBadge status={quote.status} locale={locale} />
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {t.quotes.requestedOn} {formatDate(quote.created_at)}
        {quote.quoted_at && (
          <>
            {" · "}
            {t.quotes.quotedOn} {formatDate(quote.quoted_at)}
          </>
        )}
        {quote.valid_until && (
          <>
            {" · "}
            {t.quotes.validUntil} {formatDate(quote.valid_until)}
          </>
        )}
      </p>

      {quote.status === "amende" && (
        <p className="mt-6 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t.quotes.awaitingRevision}
        </p>
      )}

      {quote.status === "nouveau" && (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t.quotes.awaiting}
        </p>
      )}

      {expired && quote.status === "chiffre" && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t.quotes.expired}
        </p>
      )}

      {quote.reply_message && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.quotes.teamMessage}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
            {quote.reply_message}
          </p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.quotes.lines}
        </h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">{t.common.reference}</th>
                <th className="px-4 py-2 text-right font-semibold">{t.quotes.quantity}</th>
                {priced && (
                  <>
                    <th className="px-4 py-2 text-right font-semibold">{t.quotes.unitPrice}</th>
                    <th className="px-4 py-2 text-right font-semibold">{t.quotes.lineTotal}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    {line.product ? (
                      <Link
                        href={p(`/produits/${line.product.slug}`)}
                        className="hover:text-brand-blue"
                      >
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {line.product.reference}
                        </span>
                        <span className="block text-xs text-slate-500">{line.product.name}</span>
                      </Link>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {line.label ?? line.free_text_reference}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{line.quantity}</td>
                  {priced && (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(line.unit_price ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {money((line.unit_price ?? 0) * line.quantity)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {priced && (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">{t.quotes.subtotal}</dt>
              <dd className="tabular-nums">{money(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">{t.quotes.shipping}</dt>
              <dd className="tabular-nums">{money(totals.shipping)}</dd>
            </div>
            {quote.vat_rate > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">
                  {t.quotes.vat} ({quote.vat_rate}%)
                </dt>
                <dd className="tabular-nums">{money(totals.vat)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
              <dt>{t.quotes.total}</dt>
              <dd className="tabular-nums">{money(totals.total)}</dd>
            </div>
          </dl>
        </section>
      )}

      {canRespond && (
        <QuoteResponseForm
          quoteId={quote.id}
          locale={locale}
          labels={{
            accept: t.quotes.accept,
            amend: t.quotes.amend,
            amendTitle: t.quotes.amendTitle,
            amendPlaceholder: t.quotes.amendPlaceholder,
            decline: t.quotes.decline,
            declineReason: t.quotes.declineReason,
          }}
        />
      )}

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.quotes.thread}
        </h2>
        <QuoteThread
          messages={messages ?? []}
          locale={locale}
          labels={{
            empty: t.quotes.threadEmpty,
            client: t.quotes.you,
            admin: t.quotes.team,
            revision: t.quotes.revision,
          }}
        />
      </section>

      {quote.status === "refuse" && (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t.quotes.declined}
          {quote.decline_reason && (
            <span className="mt-1 block text-slate-500">« {quote.decline_reason} »</span>
          )}
        </p>
      )}

      {order && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">{t.quotes.accepted}</p>
          <Link
            href={p(`/compte/commandes/${order.id}`)}
            className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand-blue hover:underline"
          >
            {order.order_number} — {t.quotes.viewOrder}
          </Link>
        </div>
      )}
    </div>
  );
}
