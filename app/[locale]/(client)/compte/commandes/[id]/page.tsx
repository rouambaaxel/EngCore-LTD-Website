import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import type { Order, OrderItem, OrderStatusHistoryEntry } from "@/lib/types";

async function getOrderDetail(id: string) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single<Order>();

  if (!order) return null;

  const [{ data: items }, { data: history }] = await Promise.all([
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
  ]);

  return { order, items: items ?? [], history: history ?? [] };
}

function formatPrice(value: number | null, locale: Locale) {
  if (value === null) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default async function CommandeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const result = await getOrderDetail(id);
  if (!result) notFound();
  const { order, items, history } = result;

  const total = items.reduce(
    (sum, item) => sum + (item.unit_price ?? 0) * item.quantity,
    0,
  );

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
                    <td className="px-4 py-3">{formatPrice(item.unit_price, locale)}</td>
                    <td className="px-4 py-3">
                      {formatPrice(
                        item.unit_price !== null ? item.unit_price * item.quantity : null,
                        locale,
                      )}
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
                      {formatPrice(total, locale)}
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
        </div>
      </div>
    </div>
  );
}
