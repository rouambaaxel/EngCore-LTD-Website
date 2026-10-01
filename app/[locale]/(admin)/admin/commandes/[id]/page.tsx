import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import {
  addOrderItem,
  addShipmentEvent,
  confirmPaymentReceived,
  deleteShipmentEvent,
  removeOrderItem,
  updateOrderNotes,
  updateOrderItems,
  updateOrderStatus,
  updateShipping,
} from "@/lib/actions/admin/orders";
import { computeTotals, formatMoney } from "@/lib/money";
import { CARRIERS, trackingUrl } from "@/lib/carriers";
import { manualCardConfirmationAllowed, siteUrl } from "@/lib/payments/config";
import OrderLinesImportForm from "@/components/OrderLinesImportForm";
import GuestOrderHandoff from "@/components/GuestOrderHandoff";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import {
  ORDER_STATUS_ORDER,
  type Order,
  type OrderItem,
  type Payment,
  type Product,
  type ShipmentEvent,
  type Profile,
} from "@/lib/types";

/** Couleur de l'etat d'un paiement. */
function paymentTone(status: string): string {
  const base = "inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold";
  if (status === "paid") return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
  if (status === "pending") return `${base} border-brand-orange bg-amber-50 text-brand-navy`;
  return `${base} border-slate-300 bg-slate-100 text-slate-600`;
}

async function getData(id: string) {
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, client:profiles(*)")
    .eq("id", id)
    .single<Order & { client: Profile | null }>();

  if (!order) {
    // Sans cette trace, une requête refusée et un identifiant inexistant
    // produisent le même 404 muet.
    if (orderError) console.error("[admin/commandes]", orderError);
    return null;
  }

  const [{ data: items }, { data: products }, { data: payments }, { data: events }] =
    await Promise.all([
    supabase
      .from("order_items")
      .select("*, product:products(*)")
      .eq("order_id", id)
      .returns<OrderItem[]>(),
    supabase.from("products").select("*").order("name").returns<Product[]>(),
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

  // Une invitation court peut-être déjà pour ce destinataire, créée ici lors
  // d'un passage précédent ou depuis l'écran des invitations. La retrouver
  // évite d'en proposer une seconde pour la même adresse.
  let invitationToken: string | null = null;
  if (!order.client_id && order.guest_email) {
    const { data: invitation } = await supabase
      .from("account_invitations")
      .select("token")
      .ilike("email", order.guest_email)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle<{ token: string }>();
    invitationToken = invitation?.token ?? null;
  }

  return {
    order,
    items: items ?? [],
    products: products ?? [],
    payments: payments ?? [],
    events: events ?? [],
    invitationToken,
  };
}

function formatPrice(value: number | null, locale: Locale, currency: string) {
  if (value === null) return "—";
  return formatMoney(value, locale, currency);
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
  const { order, items, products, payments, events, invitationToken } = result;
  const orderTotals = computeTotals(items, order.shipping_amount, order.vat_rate);

  const invitationLink = invitationToken
    ? `${siteUrl()}${p("/inscription")}?invitation=${invitationToken}`
    : null;

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
          {/*
            Sans compte, c'est l'adresse mail qui identifie le destinataire.
            Afficher « — » comme avant laissait croire à une commande orpheline.
          */}
          <p className="text-sm text-slate-500">
            {t.admin.client} :{" "}
            {order.client
              ? (order.client.company_name ?? order.client.contact_name ?? "—")
              : [order.guest_company, order.guest_name, order.guest_email]
                  .filter(Boolean)
                  .join(" · ") || "—"}
            {!order.client && (
              <span className="ml-2 inline-flex min-h-6 items-center rounded-full border border-brand-orange bg-amber-50 px-2 text-xs font-semibold text-brand-navy">
                {t.admin.guestBadge}
              </span>
            )}
          </p>
        </div>
        <OrderStatusBadge status={order.status} locale={locale} />
      </div>

      {!order.client && order.guest_email && (
        <GuestOrderHandoff
          locale={locale}
          orderNumber={order.order_number}
          trackingUrl={`${siteUrl()}${p("/suivi")}?commande=${encodeURIComponent(order.order_number)}`}
          guestEmail={order.guest_email}
          guestCompany={order.guest_company}
          guestName={order.guest_name}
          existingInvitationLink={invitationLink}
          labels={{
            title: t.admin.handoffTitle,
            intro: t.admin.handoffIntro,
            recipient: t.admin.recipient,
            trackingLink: t.admin.handoffTracking,
            accessLink: t.admin.handoffAccess,
            accessIntro: t.admin.handoffAccessIntro,
            create: t.admin.handoffCreate,
            creating: t.admin.saving,
            copyTracking: t.admin.handoffCopyTracking,
            copyAccess: t.admin.handoffCopyAccess,
            copied: t.admin.inviteCopied,
            openMail: t.admin.inviteOpenMail,
            mailSubject: t.admin.handoffMailSubject,
            mailBody: t.admin.handoffMailBody,
            pendingInvitation: t.admin.handoffPending,
          }}
        />
      )}

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

        {/*
          Ce formulaire est vide et reste hors du tableau : les champs des
          lignes s'y rattachent par `form="order-lines"`. Un <form> englobant
          le tableau imbriquerait ceux des boutons « Retirer », ce que le HTML
          interdit.
        */}
        <form id="order-lines" action={updateOrderItems}>
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="locale" value={locale} />
        </form>

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
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      name={`qty_${item.id}`}
                      form="order-lines"
                      defaultValue={item.quantity}
                      aria-label={t.account.quantity}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm focus:border-brand-blue focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      name={`price_${item.id}`}
                      form="order-lines"
                      defaultValue={item.unit_price ?? ""}
                      aria-label={t.account.unitPrice}
                      placeholder="—"
                      className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm focus:border-brand-blue focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(
                      item.unit_price !== null ? item.unit_price * item.quantity : null,
                      locale,
                      order.currency,
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
                    {formatPrice(total, locale, order.currency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {items.length > 0 && (
          <button
            type="submit"
            form="order-lines"
            className="mt-3 inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.admin.saveLines}
          </button>
        )}

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

        {/*
          Une demande arrivée par mail porte souvent une liste de vingt
          références en pièce jointe. La ressaisir ligne à ligne est le genre
          de corvée où l'on se trompe de quantité.
        */}
        <OrderLinesImportForm
          orderId={order.id}
          locale={locale}
          labels={{
            title: t.admin.lineImportTitle,
            hint: t.admin.lineImportHint,
            submit: t.admin.lineImportSubmit,
            running: t.admin.saving,
            added: t.admin.lineImportAdded,
            matched: t.admin.lineImportMatched,
            freeText: t.admin.lineImportFreeText,
            recognised: t.admin.importRecognised,
            ignored: t.admin.importIgnored,
            problems: t.admin.importProblems,
          }}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">{t.shipping.events}</h2>

        <form
          action={addShipmentEvent}
          className="mt-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="locale" value={locale} />

          <div className="grid gap-3 sm:grid-cols-[11rem_1fr_11rem]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.shipping.eventDate}
              </span>
              <input type="datetime-local" name="happened_at" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.shipping.eventLabel}
              </span>
              <input
                type="text"
                name="label"
                required
                placeholder={t.shipping.eventLabelPlaceholder}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.shipping.eventLocation}
              </span>
              <input
                type="text"
                name="location"
                placeholder={t.shipping.eventLocationPlaceholder}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-3 inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.shipping.addEvent}
          </button>

          {events.length === 0 ? (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              {t.shipping.noEvents}
            </p>
          ) : (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <ul className="space-y-2">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-slate-900">{event.label}</span>
                      <span className="block text-xs text-slate-500">
                        {new Date(event.happened_at).toLocaleString(INTL_LOCALE[locale])}
                        {event.location && ` \u00b7 ${event.location}`}
                      </span>
                    </span>
                    <form action={deleteShipmentEvent} className="shrink-0">
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        {t.admin.remove}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{t.admin.shippingSection}</h2>
        <form action={updateShipping} className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="locale" value={locale} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.admin.carrier}
              </span>
              <select
                name="carrier"
                defaultValue={order.carrier ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              >
                <option value="">—</option>
                {CARRIERS.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.admin.trackingNumber}
              </span>
              <input
                type="text"
                name="tracking_number"
                defaultValue={order.tracking_number ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none font-mono"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.admin.trackingUrl}
              </span>
              <input
                type="url"
                name="tracking_url"
                defaultValue={order.tracking_url ?? ""}
                placeholder={
                  trackingUrl(order.carrier, order.tracking_number, null) ??
                  "https://"
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {t.admin.trackingUrlHint}
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.admin.shippedAt}
              </span>
              <input
                type="date"
                name="shipped_at"
                defaultValue={order.shipped_at ? order.shipped_at.slice(0, 10) : ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.admin.estimatedDelivery}
              </span>
              <input
                type="date"
                name="estimated_delivery"
                defaultValue={order.estimated_delivery ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {t.admin.shippingAddress}
              </span>
              <textarea
                name="shipping_address"
                rows={3}
                defaultValue={order.shipping_address ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            {t.admin.saveShipping}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{t.admin.paymentSection}</h2>
          <span className="text-sm text-slate-600">
            {t.admin.orderTotal} :{" "}
            <span className="font-semibold text-slate-900">
              {formatMoney(orderTotals.total, locale, order.currency)}
            </span>
          </span>
        </div>

        {payments.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {t.admin.noPayments}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">{t.admin.paymentMethod}</th>
                  <th className="px-4 py-2 text-left font-semibold">{t.payment.date}</th>
                  <th className="px-4 py-2 text-right font-semibold">{t.admin.paymentAmount}</th>
                  <th className="px-4 py-2 text-left font-semibold">{t.admin.paymentState}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      {payment.method === "card" ? t.payment.card : t.payment.transfer}
                      {payment.transfer_reference && (
                        <span className="block font-mono text-xs text-slate-500">
                          {payment.transfer_reference}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(payment.created_at).toLocaleDateString(INTL_LOCALE[locale])}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(payment.amount, locale, payment.currency)}
                      {payment.currency !== payment.base_currency && (
                        <span className="block text-xs font-normal text-slate-500">
                          {formatMoney(payment.base_amount, locale, payment.base_currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={paymentTone(payment.status)}>{payment.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Le virement se confirme toujours à la main. La carte
                          seulement tant que le webhook Stripe n'est pas
                          branché — sinon elle s'acquitte toute seule. */}
                      {payment.status === "pending" &&
                        (payment.method === "transfer" || manualCardConfirmationAllowed()) && (
                        <form action={confirmPaymentReceived}>
                          <input type="hidden" name="payment_id" value={payment.id} />
                          <input type="hidden" name="order_id" value={order.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="text-sm font-medium text-emerald-700 hover:underline"
                          >
                            {t.admin.markPaid}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
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
