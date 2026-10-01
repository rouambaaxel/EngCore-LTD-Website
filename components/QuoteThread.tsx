import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import type { QuoteMessage } from "@/lib/types";

/**
 * Fil d'échanges d'un devis.
 *
 * La négociation peut durer plusieurs allers-retours ; sans trace écrite,
 * personne ne sait plus quelle remise a été consentie ni pourquoi. Les
 * messages de l'équipe et du client se distinguent au premier regard, et
 * chacun porte la version du devis dont il parle.
 */
export default function QuoteThread({
  messages,
  locale,
  labels,
}: {
  messages: QuoteMessage[];
  locale: Locale;
  labels: { empty: string; client: string; admin: string; revision: string };
}) {
  if (messages.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">{labels.empty}</p>;
  }

  const format = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <ul className="mt-2 space-y-3">
      {messages.map((message) => {
        const fromClient = message.author === "client";
        return (
          <li
            key={message.id}
            className={`rounded-lg border p-3 ${
              fromClient
                ? "border-slate-200 bg-white"
                : "border-brand-orange/40 bg-amber-50"
            }`}
          >
            <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="font-semibold text-slate-900">
                {fromClient ? labels.client : labels.admin}
              </span>
              <span className="text-slate-500">{format(message.created_at)}</span>
              <span className="text-slate-400">
                {labels.revision} {message.revision}
              </span>
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
              {message.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
