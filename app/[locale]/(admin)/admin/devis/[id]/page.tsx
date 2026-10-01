import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addQuoteLine,
  convertQuoteToOrder,
  postQuoteMessage,
  removeQuoteLine,
} from "@/lib/actions/admin/quotes";
import QuoteStatusBadge from "@/components/QuoteStatusBadge";
import QuotePricingForm, { type PricingLine } from "@/components/QuotePricingForm";
import QuoteThread from "@/components/QuoteThread";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";
import type { QuoteMessage, QuoteStatus } from "@/lib/types";

interface QuoteDetail {
  id: string;
  reference: string | null;
  status: QuoteStatus;
  client_id: string | null;
  full_name: string | null;
  company_name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  reply_message: string | null;
  currency: string;
  shipping_amount: number;
  vat_rate: number;
  valid_until: string | null;
  quoted_at: string | null;
  revision: number;
  responded_at: string | null;
  decline_reason: string | null;
  created_at: string;
  product: { name: string; reference: string } | null;
  items:
    | {
        id: string;
        quantity: number;
        unit_price: number | null;
        label: string | null;
        free_text_reference: string | null;
        product: { name: string; reference: string } | null;
      }[]
    | null;
}

export default async function AdminQuoteDetailPage({
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
      "*, product:products(name, reference), items:quote_request_items(id, quantity, unit_price, label, free_text_reference, product:products(name, reference))",
    )
    .eq("id", id)
    .maybeSingle<QuoteDetail>();

  if (!quote) {
    // Sans cette trace, une requête refusée et un identifiant inexistant
    // produisent le même 404 muet — impossible de distinguer les deux.
    if (quoteError) console.error("[admin/devis]", quoteError);
    notFound();
  }

  const { data: messages } = await supabase
    .from("quote_messages")
    .select("*")
    .eq("quote_request_id", quote.id)
    .order("created_at")
    .returns<QuoteMessage[]>();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("quote_request_id", quote.id)
    .maybeSingle<{ id: string; order_number: string }>();

  const lines: PricingLine[] = (quote.items ?? []).map((item) => ({
    id: item.id,
    designation: item.product?.name ?? item.free_text_reference ?? "",
    reference: item.product?.reference ?? null,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    label: item.label,
  }));

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(new Date(iso));

  return (
    <div className="max-w-4xl">
      <Link href={p("/admin/devis")} className="text-sm text-brand-blue hover:underline">
        {t.admin.backToQuotes}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {t.admin.quoteDetail}{" "}
          <span className="font-mono text-lg text-slate-500">
            {quote.reference}
            {quote.revision > 1 && ` v${quote.revision}`}
          </span>
        </h1>
        <QuoteStatusBadge status={quote.status} locale={locale} />
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="font-medium text-slate-900">
          {quote.full_name ?? t.admin.anonymous}
          {quote.company_name ? ` — ${quote.company_name}` : ""}
        </p>
        <p className="text-xs text-slate-500">
          {quote.email}
          {quote.phone ? ` · ${quote.phone}` : ""}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {t.admin.receivedOn} {formatDate(quote.created_at)}
          {quote.quoted_at && ` · ${t.admin.quoteSentOn} ${formatDate(quote.quoted_at)}`}
          {quote.responded_at &&
            quote.status === "refuse" &&
            ` · ${t.admin.quoteDeclinedOn} ${formatDate(quote.responded_at)}`}
        </p>
        {quote.message && (
          <p className="mt-3 whitespace-pre-line rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
            {quote.message}
          </p>
        )}
        {!quote.client_id && (
          <p className="mt-3 text-xs text-amber-700">{t.admin.clientNotRegistered}</p>
        )}
        {quote.decline_reason && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            « {quote.decline_reason} »
          </p>
        )}
      </section>

      {order ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">{t.quotes.statusConverti}</p>
          <Link
            href={p(`/admin/commandes/${order.id}`)}
            className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-brand-blue hover:underline"
          >
            {order.order_number} →
          </Link>
        </div>
      ) : (
        <>
          {quote.status === "amende" && (
            <p className="mt-4 rounded-lg border border-brand-orange bg-amber-50 px-4 py-3 text-sm text-brand-navy">
              {t.admin.amendmentPending}
            </p>
          )}

          {/*
            Les lignes venaient toutes du panier du client. Transport, mise en
            caisse ou remise n'y figurent jamais : il faut pouvoir en ajouter.
          */}
          <form
            action={addQuoteLine}
            className="mt-6 rounded-lg border border-slate-200 bg-white p-4"
          >
            <input type="hidden" name="id" value={quote.id} />
            <input type="hidden" name="locale" value={locale} />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.admin.addLine}
            </h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_6rem_9rem]">
              <label className="block">
                <span className="sr-only">{t.admin.lineDesignation}</span>
                <input
                  type="text"
                  name="label"
                  required
                  placeholder={t.admin.addLinePlaceholder}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="sr-only">{t.admin.lineQuantity}</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="quantity"
                  defaultValue={1}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none text-right"
                />
              </label>
              <label className="block">
                <span className="sr-only">{t.admin.linePrice}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="unit_price"
                  placeholder={t.admin.linePrice}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none text-right"
                />
              </label>
            </div>
            <button
              type="submit"
              className="mt-3 inline-flex min-h-10 items-center rounded-md border border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
            >
              {t.admin.addLine}
            </button>
          </form>

          {lines.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate text-slate-700">
                    {line.reference ? `${line.reference} — ` : ""}
                    {line.label ?? line.designation}
                  </span>
                  <form action={removeQuoteLine} className="shrink-0">
                    <input type="hidden" name="id" value={quote.id} />
                    <input type="hidden" name="line_id" value={line.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      {t.admin.removeLine}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {/*
            Le chiffrage se prépare — on peut ajouter des lignes, corriger des
            prix — mais il ne part pas tant qu'il n'y a pas de compte où le
            déposer. Masquer le formulaire d'envoi dit la règle mieux qu'un
            message d'erreur après la soumission.
          */}
          {!quote.client_id ? (
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {t.admin.quoteAwaitingAccount}
            </p>
          ) : lines.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              {t.admin.quoteNoLines}
            </p>
          ) : (
            <>
          <QuotePricingForm
            quoteId={quote.id}
            locale={locale}
            currency={quote.currency}
            lines={lines}
            defaults={{
              shipping: quote.shipping_amount,
              vatRate: quote.vat_rate,
              validUntil: quote.valid_until ?? "",
              replyMessage: quote.reply_message ?? "",
            }}
            labels={{
              priceLines: t.admin.priceLines,
              lineLabel: t.admin.lineLabel,
              unitPrice: t.admin.unitPrice,
              quantity: t.quotes.quantity,
              shippingCost: t.admin.shippingCost,
              vatRate: t.admin.vatRate,
              validUntil: t.admin.validUntil,
              replyMessage: t.admin.replyMessage,
              send: t.admin.sendQuote,
              sending: t.admin.saving,
              subtotal: t.quotes.subtotal,
              shipping: t.quotes.shipping,
              vat: t.quotes.vat,
              total: t.quotes.total,
            }}
          />

            </>
          )}

          {/* Raccourci : convertir sans attendre la réponse du client, par
              exemple pour une commande passée par téléphone. */}
          {quote.client_id && quote.status !== "converti" && lines.length > 0 && (
            <form action={convertQuoteToOrder} className="mt-4">
              <input type="hidden" name="id" value={quote.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                {t.admin.convertToOrder}
              </button>
            </form>
          )}
        </>
      )}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.admin.threadTitle}
        </h2>
        <QuoteThread
          messages={messages ?? []}
          locale={locale}
          labels={{
            empty: t.admin.threadEmpty,
            client: quote.company_name ?? quote.full_name ?? quote.email,
            admin: t.quotes.team,
            revision: t.quotes.revision,
          }}
        />

        <form action={postQuoteMessage} className="mt-3">
          <input type="hidden" name="id" value={quote.id} />
          <input type="hidden" name="locale" value={locale} />
          <textarea
            name="body"
            rows={3}
            required
            placeholder={t.admin.replyPlaceholder}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
          <button
            type="submit"
            className="mt-2 inline-flex min-h-10 items-center rounded-md border border-brand-navy px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
          >
            {t.admin.postReply}
          </button>
        </form>
      </section>
    </div>
  );
}
