import { getDictionary } from "@/lib/i18n";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Ce que la chronologie affiche, et rien de plus.
 *
 * Volontairement plus étroit que `ShipmentEvent` : le suivi public ne reçoit
 * de la base que ces quatre champs, et un `ShipmentEvent` complet reste
 * acceptable ici.
 */
export interface TimelineEvent {
  id: string;
  happened_at: string;
  label: string;
  location: string | null;
}

/**
 * Journal d'acheminement, tel que le client le lit.
 *
 * Chronologie descendante : l'étape la plus récente en tête, parce que c'est
 * celle qu'on vient chercher. Le fil vertical relie les points pour qu'on
 * suive le trajet d'un coup d'œil plutôt qu'en lisant des dates.
 */
export default function ShipmentTimeline({
  events,
  locale,
  emptyMessage,
}: {
  events: TimelineEvent[];
  locale: Locale;
  /** Affiché quand rien n'est encore saisi ; omis pour ne rien afficher. */
  emptyMessage?: string;
}) {
  const t = getDictionary(locale);

  if (events.length === 0) {
    return emptyMessage ? (
      <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
    ) : null;
  }

  const format = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <ol className="mt-3 space-y-0">
      {events.map((event, index) => {
        const latest = index === 0;
        const last = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Le fil s'arrête à la dernière étape, sinon il pendrait dans le vide. */}
            {!last && (
              <span
                aria-hidden
                className="absolute left-[5px] top-3 h-full w-px bg-slate-200"
              />
            )}
            <span
              aria-hidden
              className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                latest ? "bg-brand-orange ring-4 ring-brand-orange/20" : "bg-slate-300"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm ${
                  latest ? "font-semibold text-slate-900" : "text-slate-700"
                }`}
              >
                {event.label}
              </p>
              <p className="text-xs text-slate-500">
                {format(event.happened_at)}
                {event.location && ` · ${event.location}`}
              </p>
            </div>
          </li>
        );
      })}
      <li className="sr-only">{t.shipping.events}</li>
    </ol>
  );
}
