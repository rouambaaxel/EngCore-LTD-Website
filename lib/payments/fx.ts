import "server-only";
import { round2 } from "@/lib/money";
import { BASE_CURRENCY, fxMarginPercent, type Currency } from "./config";

/**
 * Conversion du montant dû.
 *
 * Les devis sont en livres. Un client qui règle en euro ou en dollar paie la
 * contre-valeur au taux du jour, majorée d'une marge : entre l'émission du
 * devis et l'encaissement, le cours bouge, et la banque prend sa part sur la
 * conversion. Sans cette marge, chaque règlement hors livres coûterait de
 * l'argent.
 *
 * Les taux viennent de Frankfurter, qui republie les références quotidiennes
 * de la BCE. Pas de clé, pas de quota, une source vérifiable.
 */

const ENDPOINT = "https://api.frankfurter.dev/v1/latest";

export interface Conversion {
  currency: Currency;
  /** 1 GBP = `rate` unités de `currency`, marge comprise. */
  rate: number;
  /** Taux de référence, avant marge — conservé pour l'explication. */
  referenceRate: number;
  marginPercent: number;
  amount: number;
}

/**
 * Taux de référence BCE. Mis en cache une heure : ils ne sont publiés qu'une
 * fois par jour ouvré, et interroger l'API à chaque affichage de page serait
 * à la fois lent et discourtois.
 */
async function referenceRate(target: Currency): Promise<number> {
  if (target === BASE_CURRENCY) return 1;

  const response = await fetch(
    `${ENDPOINT}?base=${BASE_CURRENCY}&symbols=${target}`,
    { next: { revalidate: 3600 } },
  );
  if (!response.ok) {
    throw new Error(`Taux de change indisponible (${response.status}).`);
  }

  const body = (await response.json()) as { rates?: Record<string, number> };
  const rate = body.rates?.[target];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Taux de change illisible.");
  }
  return rate;
}

/**
 * Convertit un montant en livres vers la devise demandée.
 *
 * Arrondi au centime supérieur : un arrondi vers le bas ferait perdre
 * quelques centimes à chaque transaction, du mauvais côté.
 */
export async function convert(
  amountInBase: number,
  target: Currency,
): Promise<Conversion> {
  const marginPercent = fxMarginPercent();

  if (target === BASE_CURRENCY) {
    return {
      currency: target,
      rate: 1,
      referenceRate: 1,
      marginPercent: 0,
      amount: round2(amountInBase),
    };
  }

  const reference = await referenceRate(target);
  const rate = reference * (1 + marginPercent / 100);

  return {
    currency: target,
    rate: Number(rate.toFixed(8)),
    referenceRate: reference,
    marginPercent,
    amount: Math.ceil(amountInBase * rate * 100) / 100,
  };
}
