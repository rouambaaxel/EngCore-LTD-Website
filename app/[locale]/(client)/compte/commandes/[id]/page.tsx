import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import ShippingCard from "@/components/ShippingCard";
import ShipmentTimeline from "@/components/ShipmentTimeline";
import PaymentPanel, { type QuotedCurrency } from "@/components/PaymentPanel";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { computeTotals, formatMoney } from "@/lib/money";
import {
  availablePaymentMethods,
  bankAccounts,
  currenciesFor,
  type Currency,
} from "@/lib/payments/config";
import { convert } from "@/lib/payments/fx";
import type {
  Order,
  OrderItem,
  OrderStatusHistoryEntry,
  Payment,
  ShipmentEvent,
} from "@/lib/types";

async function getOrderDetail(id: string) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single<Order>();

  if (!order) return null;

  const [{ data: items }, { data: history }, { data: payments }, { data: events }] =
    await Promise.all([
    supabase
      .from("order_items")
      .select("*, product:products(*)")
      .eq("order_id", id)
      .returns<OrderItem[]>(),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at")
      .returns<OrderStatusHistoryEntry[]>(),
    supabase
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .returns<Payment[]>(),
    supabase
      .from("shipment_events")
      .select("*")
      .eq("order_id", id)
      .order("happened_at", { ascending: false })
      .returns<ShipmentEvent[]>(),
  ]);

  return {
    order,
    items: items ?? [],
    history: history ?? [],
    payments: payments ?? [],
    events: events ?? [],
  };
}

function formatPrice(value: number | null, locale: Locale, currency: string) {
  if (value === null) return "—";
  return formatMoney(value, locale, currency);
}

export default async function CommandeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { locale: raw, id } = await params;
  const { paiement } = await searchParams;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const result = await getOrderDetail(id);
  if (!result) notFound();
  const { order, items, history, payments, events } = result;

  const totals = computeTotals(items, order.shipping_amount, order.vat_rate);
  const total = totals.subtotal;
  const money = (value: number | null) => formatPrice(value, locale, order.currency);

  const methods = availablePaymentMethods();
  const accounts = bankAccounts();
  const pendingTransfer = payments.some(
    (payment) => payment.method === "transfer" && payment.status === "pending",
  );
  // On ne propose de payer que si le montant est arrêté : une commande dont
  // une ligne n'a pas de prix n'est pas encore chiffrée.
  const payable =
    order.payment_status !== "paid" && !totals.incomplete && totals.total > 0;

  // Les contre-valeurs sont calculees ici, jamais dans le navigateur : le
  // client ne doit ni connaitre le taux avant nous, ni pouvoir l'influencer.
  // Une devise dont le taux echoue est simplement retiree du choix.
  const offered = new Set<Currency>(
    methods.flatMap((method) => currenciesFor(method)),
  );

  const quotes: QuotedCurrency[] = [];
  const formatAmount: Record<string, string> = {};

  if (payable) {
    for (const currency of offered) {
      try {
        const conversion = await convert(totals.total, currency);
        quotes.push({
          currency,
          amount: conversion.amount,
          marginPercent: conversion.marginPercent,
        });
        formatAmount[currency] = formatMoney(conversion.amount, locale, currency);
      } catch {
        quotes.push({ currency, amount: 0, marginPercent: 0, unavailable: true });
      }
    }
  }

  return (
    <div>
      <Link href={p("/compte/commandes")} className="text-sm text-brand-blue hover:underline">
        {t.account.backToOrders}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {t.account.order} {order.order_number}
        </h1>
        <OrderStatusBadge status={order.status} locale={locale} />
      </div>
      <p className="text-sm text-slate-500">
        {t.account.placedOn} {new Date(order.created_at).toLocaleDateString(INTL_LOCALE[locale])}
      </p>

      {/* Retour depuis Stripe ou PayPal. Le succès affiché ici est indicatif :
          seul le webhook fait foi, et c'est `payment_status` qui l'exprime. */}
      {paiement === "succes" && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.payment.success}
        </p>
      )}
      {paiement === "annule" && (
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t.payment.cancelled}
        </p>
      )}
      {paiement === "echec" && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t.payment.failed}
        </p>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">{t.account.items}</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">{t.account.item}</th>
                  <th className="px-4 py-2">{t.account.quantity}</th>
                  <th className="px-4 py-2">{t.account.unitPrice}</th>
                  <th className="px-4 py-2">{t.account.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {item.product?.name ?? item.free_text_reference ?? t.account.item}
                      </p>
                      {item.product?.reference && (
                        <p className="text-xs text-slate-500">
                          {t.common.reference} {item.product.reference}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{money(item.unit_price)}</td>
                    <td className="px-4 py-3">
                      {money(item.unit_price !== null ? item.unit_price * item.quantity : null)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      {t.account.noItems}
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-slate-700">
                      {t.account.total}
                    </td>
                    <td className="px-4 py-2 font-semibold text-slate-900">
                      {money(total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {order.notes && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-slate-900">{t.account.notes}</h2>
              <p className="mt-2 text-sm text-slate-700">{order.notes}</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t.account.tracking}</h2>
          <div className="mt-4">
            <OrderStatusTimeline
              currentStatus={order.status}
              history={history}
              locale={locale}
            />
          </div>

          {/*
            Le journal saisi par l'equipe passe avant les coordonnees du
            transporteur : c'est ce qu'un client vient lire.
          */}
          {events.length > 0 && (
            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {t.shipping.events}
              </h2>
              <ShipmentTimeline events={events} locale={locale} />
            </section>
          )}

          <ShippingCard order={order} locale={locale} />

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">{t.payment.title}</h2>
              <span
                className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${
                  order.payment_status === "paid"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : order.payment_status === "pending"
                      ? "border-brand-orange bg-amber-50 text-brand-navy"
                      : "border-slate-300 bg-slate-100 text-slate-700"
                }`}
              >
                {order.payment_status === "paid"
                  ? t.payment.statusPaid
                  : order.payment_status === "pending"
                    ? t.payment.statusPending
                    : order.payment_status === "refunded"
                      ? t.payment.statusRefunded
                      : t.payment.statusUnpaid}
              </span>
            </div>

            {!totals.incomplete && (
              <dl className="mt-3 space-y-1 border-b border-slate-100 pb-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t.quotes.subtotal}</dt>
                  <dd className="tabular-nums">{money(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t.quotes.shipping}</dt>
                  <dd className="tabular-nums">{money(totals.shipping)}</dd>
                </div>
                {order.vat_rate > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">
                      {t.quotes.vat} ({order.vat_rate}%)
                    </dt>
                    <dd className="tabular-nums">{money(totals.vat)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-bold text-slate-900">
                  <dt>{t.payment.amountDue}</dt>
                  <dd className="tabular-nums">{money(totals.total)}</dd>
                </div>
              </dl>
            )}

            {payable ? (
              <PaymentPanel
                orderId={order.id}
                locale={locale}
                methods={methods}
                accounts={accounts}
                quotes={quotes}
                baseAmountLabel={money(totals.total)}
                formatAmount={formatAmount}
                transferReference={order.order_number}
                hasPendingTransfer={pendingTransfer}
                labels={{
                  choose: t.payment.choose,
                  card: t.payment.card,
                  cardHint: t.payment.cardHint,
                  transfer: t.payment.transfer,
                  transferHint: t.payment.transferHint,
                  currency: t.payment.currency,
                  converted: t.payment.converted,
                  rateNote: t.payment.rateNote,
                  amountInBase: t.payment.amountInBase,
                  pay: t.payment.pay,
                  submitting: t.payment.submitting,
                  unavailable: t.payment.unavailable,
                  transferTitle: t.payment.transferTitle,
                  transferIntro: t.payment.transferIntro,
                  transferAccount: t.payment.transferAccount,
                  accountName: t.payment.accountName,
                  bankName: t.payment.bankName,
                  iban: t.payment.iban,
                  swift: t.payment.swift,
                  bankAddress: t.payment.bankAddress,
                  transferReference: t.payment.transferReference,
                  transferPending: t.payment.transferPending,
                }}
              />
            ) : (
              order.payment_status === "paid" && (
                <p className="mt-3 text-sm text-emerald-800">{t.payment.success}</p>
              )
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
