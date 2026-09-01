import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale } from "@/lib/i18n/config";
import type { Order, Profile } from "@/lib/types";

async function getDashboardData(): Promise<{ profile: Profile | null; orders: Order[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { profile: null, orders: [] };

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("orders")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return { profile: profile ?? null, orders: orders ?? [] };
}

export default async function CompteDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const { profile, orders } = await getDashboardData();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        {t.account.greeting}
        {profile?.contact_name ? `, ${profile.contact_name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {profile?.company_name ?? t.account.welcome}
      </p>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t.account.recentOrders}</h2>
        <Link
          href={p("/compte/commandes")}
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          {t.account.viewAllOrders}
        </Link>
      </div>

      {orders.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={p(`/compte/commandes/${order.id}`)}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString(INTL_LOCALE[locale])}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} locale={locale} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t.account.noOrdersYet}
        </p>
      )}
    </div>
  );
}
