import "server-only";
import Stripe from "stripe";
import { toMinorUnits } from "@/lib/money";
import { siteUrl, stripeSecretKey, stripeWebhookSecret, type Currency } from "./config";

let client: Stripe | null = null;

function stripe(): Stripe {
  const key = stripeSecretKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY absente.");
  client ??= new Stripe(key);
  return client;
}

/**
 * Ouvre une session Stripe Checkout et renvoie l'URL de paiement.
 *
 * On passe par la page hébergée par Stripe : aucune donnée de carte ne
 * transite par le site, ce qui nous tient hors du périmètre PCI.
 *
 * Une seule ligne, portant le total exact déjà enregistré. Détailler le panier
 * obligerait à répartir TVA et transport ligne à ligne, et la somme des
 * arrondis s'écarterait du montant contrôlé en base — un écart d'un penny
 * suffirait à faire échouer un règlement légitime. Le détail reste sur le
 * devis et sur le site, où il a sa place.
 */
export async function createCheckoutSession({
  orderId,
  paymentId,
  orderNumber,
  email,
  amount,
  currency,
  description,
  locale,
}: {
  orderId: string;
  paymentId: string;
  orderNumber: string;
  email: string | null;
  amount: number;
  currency: Currency;
  description: string;
  locale: string;
}): Promise<string> {
  const base = siteUrl();

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toMinorUnits(amount),
          product_data: {
            name: `Engcore Ltd — ${orderNumber}`,
            description: description.slice(0, 500),
          },
        },
      },
    ],
    customer_email: email ?? undefined,
    client_reference_id: orderNumber,
    metadata: { order_id: orderId, payment_id: paymentId },
    payment_intent_data: {
      metadata: { order_id: orderId, payment_id: paymentId },
      description: `Engcore Ltd — ${orderNumber}`,
    },
    success_url: `${base}/${locale}/compte/commandes/${orderId}?paiement=succes`,
    cancel_url: `${base}/${locale}/compte/commandes/${orderId}?paiement=annule`,
  });

  if (!session.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
  return session.url;
}

/**
 * Vérifie la signature d'un webhook. Sans cela, n'importe qui pourrait
 * appeler notre endpoint pour marquer une commande payée.
 */
export function verifyWebhook(payload: string, signature: string): Stripe.Event {
  const secret = stripeWebhookSecret();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET absente.");
  return stripe().webhooks.constructEvent(payload, signature, secret);
}
