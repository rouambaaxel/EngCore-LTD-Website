import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { OrderStatus } from "@/lib/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  nouvelle: "bg-slate-100 text-slate-700",
  en_preparation: "bg-amber-100 text-amber-800",
  expediee: "bg-brand-blue/10 text-brand-blue",
  livree: "bg-green-100 text-green-800",
  annulee: "bg-red-100 text-red-800",
};

export default function OrderStatusBadge({
  status,
  locale,
}: {
  status: OrderStatus;
  locale: Locale;
}) {
  const t = getDictionary(locale);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {t.orderStatus[status]}
    </span>
  );
}
