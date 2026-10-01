import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { QuoteStatus } from "@/lib/types";

/** Couleur par étape : l'orange marque la seule qui attend le client. */
const TONE: Record<QuoteStatus, string> = {
  // Rien ne peut avancer tant que le compte n'existe pas : c'est un blocage,
  // pas une étape — il se signale donc comme tel.
  en_attente_compte: "border-red-200 bg-red-50 text-red-800",
  nouveau: "border-slate-300 bg-slate-100 text-slate-700",
  chiffre: "border-brand-orange bg-amber-50 text-brand-navy",
  // Bleu ardoise : la balle est dans notre camp, pas dans celui du client.
  amende: "border-slate-400 bg-slate-100 text-slate-800",
  accepte: "border-emerald-300 bg-emerald-50 text-emerald-800",
  refuse: "border-red-200 bg-red-50 text-red-800",
  converti: "border-blue-200 bg-blue-50 text-brand-blue",
};

export default function QuoteStatusBadge({
  status,
  locale,
}: {
  status: QuoteStatus;
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const label: Record<QuoteStatus, string> = {
    en_attente_compte: t.quotes.statusEnAttenteCompte,
    nouveau: t.quotes.statusNouveau,
    chiffre: t.quotes.statusChiffre,
    amende: t.quotes.statusAmende,
    accepte: t.quotes.statusAccepte,
    refuse: t.quotes.statusRefuse,
    converti: t.quotes.statusConverti,
  };

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${TONE[status]}`}
    >
      {label[status]}
    </span>
  );
}
