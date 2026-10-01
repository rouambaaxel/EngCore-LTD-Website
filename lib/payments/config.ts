import type { PaymentMethod } from "@/lib/types";

/**
 * Moyens de paiement et comptes de réception.
 *
 * Deux moyens : la carte, par Stripe, et le virement international. Chacun
 * s'active en renseignant ses variables d'environnement — le site n'affiche
 * jamais un bouton qui mènerait à une impasse.
 */

/**
 * Devises dans lesquelles un client peut s'acquitter.
 *
 * La base accepte aussi le dollar : rouvrir cette devise ne demande que de
 * l'ajouter ici et de renseigner le compte correspondant.
 */
export const CURRENCIES = ["GBP", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Devise de facturation : les devis sont toujours établis en livres. */
export const BASE_CURRENCY: Currency = "GBP";

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

export interface BankAccount {
  currency: Currency;
  accountName: string;
  bankName: string;
  iban: string;
  swift: string;
  address: string | null;
}

const env = (name: string): string => (process.env[name] ?? "").trim();

export function stripeSecretKey(): string {
  return env("STRIPE_SECRET_KEY");
}

export function stripeWebhookSecret(): string {
  return env("STRIPE_WEBHOOK_SECRET");
}

/**
 * Marge appliquée au taux de change, en pourcentage.
 *
 * Elle couvre le risque de change entre l'émission du devis et l'encaissement,
 * ainsi que les frais de conversion bancaires. Réglable sans toucher au code.
 */
export function fxMarginPercent(): number {
  const raw = Number(env("FX_MARGIN_PERCENT"));
  return Number.isFinite(raw) && raw >= 0 && raw <= 50 ? raw : 5;
}

/** Un compte par devise ; IBAN et BIC suffisent à l'activer. */
export function bankAccount(currency: Currency): BankAccount | null {
  const iban = env(`BANK_${currency}_IBAN`);
  const swift = env(`BANK_${currency}_SWIFT`);
  if (!iban || !swift) return null;

  return {
    currency,
    accountName: env(`BANK_${currency}_ACCOUNT_NAME`) || env("BANK_ACCOUNT_NAME") || "Engcore Ltd",
    bankName: env(`BANK_${currency}_NAME`),
    iban,
    swift,
    address: env(`BANK_${currency}_ADDRESS`) || null,
  };
}

export function bankAccounts(): BankAccount[] {
  return CURRENCIES.map(bankAccount).filter((a): a is BankAccount => a !== null);
}

/**
 * URL publique du site.
 *
 * Elle sert aux retours de Stripe, aux liens d'invitation et aux liens de
 * suivi — tout ce qui doit pouvoir être cliqué depuis une boîte mail.
 *
 * Le repli sur le domaine fourni par la plateforme n'est pas un luxe : au
 * premier déploiement, le domaine n'est connu qu'une fois le déploiement fait,
 * et une variable restée à sa valeur de développement enverrait les clients
 * sur leur propre machine. Mieux vaut un domaine technique juste qu'un
 * `localhost` faux.
 */
export function siteUrl(): string {
  const configured = env("NEXT_PUBLIC_SITE_URL");
  if (configured) return configured.replace(/\/$/, "");

  const platform =
    env("VERCEL_PROJECT_PRODUCTION_URL") || env("VERCEL_URL") || env("RENDER_EXTERNAL_URL");
  if (platform) {
    const clean = platform.replace(/\/$/, "");
    return /^https?:\/\//.test(clean) ? clean : `https://${clean}`;
  }

  return "http://localhost:3000";
}

export function availablePaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (stripeSecretKey()) methods.push("card");
  if (bankAccounts().length > 0) methods.push("transfer");
  return methods;
}

/**
 * Devises réellement proposables pour un moyen donné.
 *
 * Stripe encaisse les trois sans configuration supplémentaire ; le virement
 * n'est possible que vers un compte effectivement ouvert.
 */
export function currenciesFor(method: PaymentMethod): Currency[] {
  if (method === "transfer") return bankAccounts().map((a) => a.currency);
  return stripeSecretKey() ? [...CURRENCIES] : [];
}

/**
 * La confirmation manuelle d'un paiement par carte est-elle autorisée ?
 *
 * Uniquement tant que le webhook n'est pas branché. Sans lui, Stripe ne peut
 * prévenir personne et une commande réglée resterait en attente pour
 * toujours ; avec lui, une confirmation à la main ne ferait que contourner la
 * seule preuve d'encaissement dont nous disposons.
 */
export function manualCardConfirmationAllowed(): boolean {
  return stripeSecretKey() !== "" && stripeWebhookSecret() === "";
}
