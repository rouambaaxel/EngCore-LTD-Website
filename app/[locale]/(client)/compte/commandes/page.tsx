import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { carrierLabel, trackingUrl } from "@/lib/carriers";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Order } from "@/lib/types";

async function getOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function CommandesPage({
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
      <h1 className="text-2xl font-bold text-slate-900">{t.account.myOrders}</h1>

      {orders.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {orders.map((order) => {
            const link = trackingUrl(
              order.carrier,
              order.tracking_number,
              order.tracking_url,
            );

            return (
              <li key={order.id} className="px-4 py-3 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-4">
                  <Link href={p(`/compte/commandes/${order.id}`)} className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleDateString(INTL_LOCALE[locale])}
                    </p>
                  </Link>
                  <OrderStatusBadge status={order.status} locale={locale} />
                </div>

                {/*
                  Le suivi remonte dans la liste : c'est ce qu'un client vient
                  chercher, et l'obliger à ouvrir chaque commande pour trouver
                  un numéro de colis est une navigation de trop.
                */}
                {order.tracking_number && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs">
                    {order.carrier && (
                      <span className="font-medium text-slate-600">
                        {carrierLabel(order.carrier)}
                      </span>
                    )}
                    <span className="font-mono text-slate-500">{order.tracking_number}</span>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 items-center font-semibold text-brand-blue hover:underline"
                      >
                        {t.shipping.trackShort} →
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t.account.noOrders}
        </p>
      )}
    </div>
  );
}
