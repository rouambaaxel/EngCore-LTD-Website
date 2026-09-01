import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import {
  addOrderItem,
  removeOrderItem,
  updateOrderNotes,
  updateOrderStatus,
} from "@/lib/actions/admin/orders";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import {
  ORDER_STATUS_ORDER,
  type Order,
  type OrderItem,
  type Product,
  type Profile,
} from "@/lib/types";

async function getData(id: string) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, client:profiles(*)")
    .eq("id", id)
    .single<Order & { client: Profile }>();

  if (!order) return null;

  const [{ data: items }, { data: products }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*, product:products(*)")
      .eq("order_id", id)
      .returns<OrderItem[]>(),
    supabase.from("products").select("*").order("name").returns<Product[]>(),
  ]);

  return { order, items: items ?? [], products: products ?? [] };
}

function formatPrice(value: number | null, locale: Locale) {
  if (value === null) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default async function AdminCommandeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const result = await getData(id);
  if (!result) notFound();
  const { order, items, products } = result;

  const total = items.reduce(
    (sum, item) => sum + (item.unit_price ?? 0) * item.quantity,
    0,
  );

  return (
    <div>
      <Link href={p("/admin/commandes")} className="text-sm text-brand-blue hover:underline">
        {t.admin.backToOrders}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.account.order} {order.order_number}
          </h1>
          <p className="text-sm text-slate-500">
            {t.admin.client} : {order.client?.company_name ?? order.client?.contact_name ?? "—"}
          </p>
        </div>
        <OrderStatusBadge status={order.status} locale={locale} />
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">{t.admin.changeStatus}</p>
        <form action={updateOrderStatus} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="locale" value={locale} />
          <select
            name="status"
            defaultValue={order.status}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          >
            {[...ORDER_STATUS_ORDER, "annulee" as const].map((status) => (
              <option key={status} value={status}>
                {t.orderStatus[status]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.admin.update}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">{t.account.items}</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">{t.account.item}</th>
                <th className="px-4 py-2">{t.account.quantity}</th>
                <th className="px-4 py-2">{t.account.unitPrice}</th>
                <th className="px-4 py-2">{t.account.total}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {item.product?.name ?? item.free_text_reference ?? t.account.item}
                  </td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{formatPrice(item.unit_price, locale)}</td>
                  <td className="px-4 py-3">
                    {formatPrice(
                      item.unit_price !== null ? item.unit_price * item.quantity : null,
                      locale,
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={removeOrderItem}>
                      <input type="hidden" name="item_id" value={item.id} />
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="text-red-600 hover:underline">
                        {t.admin.remove}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    {t.admin.noItemsYet}
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
                  <td colSpan={2} className="px-4 py-2 font-semibold text-slate-900">
                    {formatPrice(total, locale)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <form
          action={addOrderItem}
          className="mt-4 grid gap-3 rounded-lg border border-dashed border-slate-300 p-4 sm:grid-cols-5"
        >
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="locale" value={locale} />
          <select
            name="product_id"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          >
            <option value="">{t.admin.offCatalogueItem}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.reference})
              </option>
            ))}
          </select>
          <input
            type="text"
            name="free_text_reference"
            placeholder={t.admin.freeReference}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="quantity"
            min={1}
            defaultValue={1}
            placeholder={t.account.quantity}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="unit_price"
            step="0.01"
            min={0}
            placeholder={t.admin.unitPricePlaceholder}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue sm:col-span-5"
          >
            {t.admin.addItem}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">{t.admin.internalNotes}</h2>
        <form action={updateOrderNotes} className="mt-2 space-y-2">
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="locale" value={locale} />
          <textarea
            name="notes"
            rows={3}
            defaultValue={order.notes ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.admin.saveNotes}
          </button>
        </form>
      </div>
    </div>
  );
}
