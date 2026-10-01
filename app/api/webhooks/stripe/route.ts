import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { verifyWebhook } from "@/lib/payments/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { round2 } from "@/lib/money";

/**
 * Confirmation d'encaissement par Stripe.
 *
 * C'est ici, et nulle part ailleurs, qu'un paiement par carte devient « payé » :
 * le retour du navigateur ne prouve rien, l'utilisateur pouvant fermer l'onglet
 * ou forger l'URL de succès. La signature du webhook est vérifiée avant tout
 * traitement, et l'écriture passe par la clé de service, hors RLS.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "signature absente" }, { status: 400 });
  }

  // Le corps brut est indispensable : re-sérialiser le JSON invaliderait la
  // signature.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = verifyWebhook(payload, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "signature invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Les autres événements sont acquittés sans action : renvoyer une erreur
    // ferait rejouer Stripe indéfiniment.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const paymentId = session.metadata?.payment_id;
  if (!paymentId) {
    return NextResponse.json({ error: "métadonnée payment_id absente" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    // Sans clé de service on ne peut rien écrire : répondre 500 fait rejouer
    // Stripe, ce qui laisse le temps de corriger la configuration.
    return NextResponse.json({ error: "clé de service absente" }, { status: 500 });
  }

  const { error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_reference: session.payment_intent
        ? String(session.payment_intent)
        : session.id,
      amount: session.amount_total ? round2(session.amount_total / 100) : undefined,
    })
    .eq("id", paymentId)
    .neq("status", "paid");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
