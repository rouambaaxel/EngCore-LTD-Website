import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Order, Profile } from "@/lib/types";

async function getOrders(): Promise<(Order & { client: Profile | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, client:profiles(*)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminCommandesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const orders = await getOrders();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.admin.orders}</h1>
        <Link
          href={p("/admin/commandes/nouveau")}
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.admin.newOrder}
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">{t.admin.orders}</th>
              <th className="px-4 py-2">{t.admin.client}</th>
              <th className="px-4 py-2">{t.admin.date}</th>
              <th className="px-4 py-2">{t.admin.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3">
                  <Link
                    href={p(`/admin/commandes/${order.id}`)}
                    className="font-medium text-brand-blue hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {order.client
                    ? (order.client.company_name ?? order.client.contact_name ?? "—")
                    : order.guest_company ?? order.guest_name ?? order.guest_email ?? "—"}
                  {!order.client && (
                    <span className="ml-2 inline-flex min-h-6 items-center rounded-full border border-brand-orange bg-amber-50 px-2 text-xs font-semibold text-brand-navy">
                      {t.admin.guestBadge}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(order.created_at).toLocaleDateString(INTL_LOCALE[locale])}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} locale={locale} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  {t.admin.noOrders}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
