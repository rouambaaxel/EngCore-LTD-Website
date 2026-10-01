import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Devise de facturation. Engcore Ltd est une société britannique : les devis
 * et les encaissements sont en livres, quelle que soit la langue du visiteur.
 */
export const CURRENCY = "GBP";

/** Plus petite unité, pour les prestataires qui comptent en pence. */
export const MINOR_UNITS_PER_UNIT = 100;

export function formatMoney(
  amount: number,
  locale: Locale,
  currency: string = CURRENCY,
): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
  }).format(amount);
}

/** Stripe attend un entier en centimes : jamais un flottant. */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * MINOR_UNITS_PER_UNIT);
}

export interface PricedLine {
  quantity: number;
  unit_price: number | null;
}

export interface Totals {
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
  /** Vrai tant qu'une ligne n'a pas de prix : le devis n'est pas chiffrable. */
  incomplete: boolean;
}

/**
 * Sous-total, port, TVA et total.
 *
 * Doit rester l'image exacte de `public.order_total()` côté base : cette
 * fonction sert l'affichage et le montant envoyé au prestataire, la fonction
 * SQL garde la porte contre un client qui déclarerait payer moins. Deux
 * arrondis divergents suffiraient à faire échouer un paiement légitime.
 */
export function computeTotals(
  lines: PricedLine[],
  shipping = 0,
  vatRate = 0,
): Totals {
  const incomplete = lines.some((line) => line.unit_price === null);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * (line.unit_price ?? 0),
    0,
  );
  const net = subtotal + shipping;
  const total = round2(net * (1 + vatRate / 100));

  return {
    subtotal: round2(subtotal),
    shipping: round2(shipping),
    vat: round2(total - round2(net)),
    total,
    incomplete,
  };
}

/** Arrondi commercial à deux décimales, sans dérive binaire. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Lit un montant saisi dans un formulaire ; virgule décimale acceptée. */
export function parseAmount(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (text === "") return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return round2(value);
}
