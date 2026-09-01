import { getDictionary } from "@/lib/i18n";
import { formatCancelledOn } from "@/lib/i18n/format";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import {
  ORDER_STATUS_ORDER,
  type OrderStatus,
  type OrderStatusHistoryEntry,
} from "@/lib/types";

function formatDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleString(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderStatusTimeline({
  currentStatus,
  history,
  locale,
}: {
  currentStatus: OrderStatus;
  history: OrderStatusHistoryEntry[];
  locale: Locale;
}) {
  const t = getDictionary(locale);

  if (currentStatus === "annulee") {
    const cancelledAt = history.find((h) => h.status === "annulee");
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {cancelledAt
          ? formatCancelledOn(formatDate(cancelledAt.created_at, locale), locale)
          : t.account.cancelled}
      </div>
    );
  }

  const reachedIndex = ORDER_STATUS_ORDER.indexOf(currentStatus);
  const dateByStatus = new Map(history.map((h) => [h.status, h.created_at]));

  return (
    <ol className="space-y-0">
      {ORDER_STATUS_ORDER.map((status, index) => {
        const reached = index <= reachedIndex;
        const date = dateByStatus.get(status);
        const isLast = index === ORDER_STATUS_ORDER.length - 1;

        return (
          <li key={status} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[11px] top-6 h-full w-0.5 ${
                  reached ? "bg-brand-navy" : "bg-slate-200"
                }`}
              />
            )}
            <span
              className={`z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                reached
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-slate-300 bg-white text-slate-300"
              }`}
            >
              {reached ? "✓" : ""}
            </span>
            <div>
              <p className={`font-medium ${reached ? "text-slate-900" : "text-slate-400"}`}>
                {t.orderStatus[status]}
              </p>
              {date && <p className="text-xs text-slate-500">{formatDate(date, locale)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
