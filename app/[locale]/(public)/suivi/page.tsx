import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import ShipmentTimeline from "@/components/ShipmentTimeline";
import { carrierLabel, trackingUrl } from "@/lib/carriers";
import { trackOrder } from "@/lib/orders/tracking";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";

/**
 * Suivi d'une commande par son numéro, sans compte.
 *
 * Le formulaire part en GET : l'adresse porte alors le numéro, ce qui permet
 * de la transmettre telle quelle à celui qui réceptionne la marchandise, et
 * de la recharger sans renvoyer de formulaire.
 */
export default async function SuiviPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ commande?: string }>;
}) {
  const { locale: raw } = await params;
  const { commande } = await searchParams;

  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const query = (commande ?? "").trim();
  const tracking = query ? await trackOrder(query) : null;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(
      new Date(iso),
    );

  const portal = tracking
    ? trackingUrl(tracking.carrier, tracking.trackingNumber, tracking.trackingUrl)
    : null;

  const hasShippingDetail = Boolean(
    tracking &&
      (tracking.carrier ||
        tracking.trackingNumber ||
        tracking.shippedAt ||
        tracking.estimatedDelivery ||
        tracking.events.length > 0),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[{ label: t.common.home, href: p("/") }, { label: t.tracking.title }]}
      />

      <h1 className="mt-2 text-2xl font-bold text-slate-900">{t.tracking.title}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.tracking.intro}</p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="block text-sm font-medium text-slate-700">
            {t.tracking.field}
          </span>
          <input
            type="text"
            name="commande"
            defaultValue={query}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder={t.tracking.placeholder}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-blue focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-brand-navy px-5 text-sm font-semibold text-white hover:bg-brand-blue"
        >
          {t.tracking.submit}
        </button>
      </form>

      {query && !tracking && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t.tracking.notFound}
        </p>
      )}

      {tracking && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.tracking.resultTitle}
              </p>
              <p className="font-mono text-lg font-bold text-slate-900">
                {tracking.orderNumber}
              </p>
              <p className="text-xs text-slate-500">
                {t.tracking.orderedOn} {formatDate(tracking.orderedAt)}
              </p>
            </div>
            <OrderStatusBadge status={tracking.status} locale={locale} />
          </div>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.tracking.progress}
            </h2>
            <div className="mt-4">
              {/*
                Les dates de changement d'état vivent dans
                `order_status_history`, que le suivi public n'ouvre pas : la
                chronologie montre donc l'avancement, pas son calendrier. Le
                journal d'étapes ci-dessous, lui, porte ses propres dates.
              */}
              <OrderStatusTimeline
                currentStatus={tracking.status}
                history={[]}
                locale={locale}
              />
            </div>
          </section>

          {hasShippingDetail ? (
            <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">{t.shipping.title}</h2>

              <dl className="mt-3 space-y-1 text-sm">
                {tracking.carrier && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t.shipping.carrier}</dt>
                    <dd className="text-slate-900">{carrierLabel(tracking.carrier)}</dd>
                  </div>
                )}
                {tracking.trackingNumber && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t.shipping.trackingNumber}</dt>
                    <dd className="font-mono text-slate-900">{tracking.trackingNumber}</dd>
                  </div>
                )}
                {tracking.shippedAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t.shipping.shippedOn}</dt>
                    <dd className="text-slate-900">{formatDate(tracking.shippedAt)}</dd>
                  </div>
                )}
                {tracking.estimatedDelivery && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t.shipping.estimatedDelivery}</dt>
                    <dd className="text-slate-900">
                      {formatDate(tracking.estimatedDelivery)}
                    </dd>
                  </div>
                )}
              </dl>

              {tracking.events.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.shipping.events}
                  </h3>
                  <ShipmentTimeline events={tracking.events} locale={locale} />
                </div>
              )}

              {portal ? (
                <a
                  href={portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand-navy px-4 text-sm font-semibold text-white hover:bg-brand-blue"
                >
                  {t.shipping.track}
                </a>
              ) : (
                tracking.trackingNumber && (
                  <p className="mt-3 text-xs text-slate-500">{t.shipping.noPortal}</p>
                )
              )}
            </section>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
              {/*
                Annoncer « l'expédition n'est pas encore engagée » sur une
                commande déjà livrée serait absurde : passé le départ, un
                encadré vide veut dire que rien n'a été saisi, pas que rien
                n'a eu lieu.
              */}
              {tracking.status === "nouvelle" || tracking.status === "en_preparation"
                ? t.tracking.noShippingYet
                : t.tracking.noShippingDetail}
            </p>
          )}

          <p className="mt-6 text-xs text-slate-500">{t.tracking.privacyNote}</p>
          <Link
            href={p("/compte/commandes")}
            className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-brand-blue hover:underline"
          >
            {t.tracking.accountCta} →
          </Link>
        </div>
      )}
    </div>
  );
}
