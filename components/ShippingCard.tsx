import { carrierLabel, trackingUrl } from "@/lib/carriers";
import { getDictionary } from "@/lib/i18n";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Order } from "@/lib/types";

/**
 * Suivi logistique côté client.
 *
 * N'apparaît que si l'équipe a renseigné quelque chose : un encadré
 * « aucune information » sur une commande à peine passée n'apprend rien.
 */
export default function ShippingCard({
  order,
  locale,
}: {
  order: Order;
  locale: Locale;
}) {
  const t = getDictionary(locale);

  const hasAny =
    order.carrier ||
    order.tracking_number ||
    order.shipped_at ||
    order.estimated_delivery ||
    order.shipping_address;

  if (!hasAny) return null;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(new Date(iso));

  const link = trackingUrl(order.carrier, order.tracking_number, order.tracking_url);

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">{t.shipping.title}</h2>

      <dl className="mt-3 space-y-1 text-sm">
        {order.carrier && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t.shipping.carrier}</dt>
            <dd className="text-slate-900">{carrierLabel(order.carrier)}</dd>
          </div>
        )}
        {order.tracking_number && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t.shipping.trackingNumber}</dt>
            <dd className="font-mono text-slate-900">{order.tracking_number}</dd>
          </div>
        )}
        {order.shipped_at && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t.shipping.shippedOn}</dt>
            <dd className="text-slate-900">{formatDate(order.shipped_at)}</dd>
          </div>
        )}
        {order.estimated_delivery && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">{t.shipping.estimatedDelivery}</dt>
            <dd className="text-slate-900">{formatDate(order.estimated_delivery)}</dd>
          </div>
        )}
      </dl>

      {order.shipping_address && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.shipping.address}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
            {order.shipping_address}
          </p>
        </div>
      )}

      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.shipping.track}
        </a>
      ) : (
        order.tracking_number && (
          // Fret aérien ou groupage : le numéro existe mais aucun portail
          // public ne l'accepte. Le dire évite un clic dans le vide.
          <p className="mt-3 text-xs text-slate-500">{t.shipping.noPortal}</p>
        )
      )}
    </section>
  );
}
