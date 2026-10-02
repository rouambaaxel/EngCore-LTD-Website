"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expectWrite, logWrite } from "./write";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { parseAmount } from "@/lib/money";
import { manualCardConfirmationAllowed } from "@/lib/payments/config";
import type { OrderStatus } from "@/lib/types";

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface OrderActionState {
  error: string | null;
}

/** Grossier à dessein : refuser une adresse valide coûte plus cher que l'inverse. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Crée une commande, pour un compte client ou pour un destinataire qui n'en a
 * pas encore.
 *
 * Le second cas est le courant du négoce : la demande arrive par mail, elle
 * est validée par retour de message, et le compte viendra après — ou jamais.
 * Le destinataire suit son acheminement avec le numéro de commande ; les
 * lignes, les montants et le règlement attendent qu'il ouvre un espace.
 */
export async function createOrder(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const forGuest = String(formData.get("recipient") ?? "") === "guest";

  const clientId = String(formData.get("client_id") ?? "").trim();
  const guestEmail = String(formData.get("guest_email") ?? "").trim().toLowerCase();

  if (!forGuest && !clientId) {
    return { error: t.admin.selectClientError };
  }
  if (forGuest && !looksLikeEmail(guestEmail)) {
    return { error: t.admin.guestEmailRequired };
  }

  const recipient = forGuest
    ? {
        client_id: null,
        guest_email: guestEmail,
        guest_name: String(formData.get("guest_name") ?? "").trim() || null,
        guest_company: String(formData.get("guest_company") ?? "").trim() || null,
        guest_phone: String(formData.get("guest_phone") ?? "").trim() || null,
      }
    : { client_id: clientId };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({ ...recipient, notes })
    .select("id")
    .single();

  if (error || !data) {
    return { error: t.admin.createOrderError + (error?.message ?? "") };
  }

  revalidatePath(localePath(locale, "/admin/commandes"));
  redirect(localePath(locale, `/admin/commandes/${data.id}`));
}

export async function updateOrderStatus(formData: FormData) {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!orderId || !status) return;

  const supabase = await createClient();
  expectWrite(
    "changement de statut",
    await supabase.from("orders").update({ status }).eq("id", orderId).select("id"),
  );

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, "/admin/commandes"));
}

export async function updateOrderNotes(formData: FormData) {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!orderId) return;

  const supabase = await createClient();
  expectWrite(
    "note interne",
    await supabase.from("orders").update({ notes }).eq("id", orderId).select("id"),
  );

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
}

export async function addOrderItem(formData: FormData) {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "");
  const productId = String(formData.get("product_id") ?? "").trim() || null;
  const freeText = String(formData.get("free_text_reference") ?? "").trim() || null;
  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPriceRaw = String(formData.get("unit_price") ?? "").trim();
  const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : null;

  if (!orderId || (!productId && !freeText) || quantity < 1) return;

  const supabase = await createClient();
  expectWrite(
    "ajout d'une ligne de commande",
    await supabase
      .from("order_items")
      .insert({
        order_id: orderId,
        product_id: productId,
        free_text_reference: freeText,
        quantity,
        unit_price: unitPrice,
      })
      .select("id"),
  );

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
}

export async function removeOrderItem(formData: FormData) {
  const locale = localeOf(formData);
  const itemId = String(formData.get("item_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  if (!itemId) return;

  const supabase = await createClient();
  logWrite(
    "suppression d'une ligne de commande",
    await supabase.from("order_items").delete().eq("id", itemId),
  );

  if (orderId) revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
}

/**
 * Informations d'expédition.
 *
 * Renseigner un numéro de suivi fait basculer la commande en « expédiée » si
 * elle ne l'est pas déjà : oublier de changer le statut après avoir collé un
 * numéro de suivi est l'erreur la plus facile à commettre, et la plus visible
 * côté client.
 */
export async function updateShipping(formData: FormData) {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) return;

  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const trackingNumber = text("tracking_number");
  const shippedAt = text("shipped_at");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single<{ status: OrderStatus }>();

  const patch: Record<string, string | null> = {
    carrier: text("carrier"),
    tracking_number: trackingNumber,
    tracking_url: text("tracking_url"),
    estimated_delivery: text("estimated_delivery"),
    shipping_address: text("shipping_address"),
    shipped_at: shippedAt ? new Date(shippedAt).toISOString() : null,
  };

  if (trackingNumber && order && (order.status === "nouvelle" || order.status === "en_preparation")) {
    patch.status = "expediee";
    patch.shipped_at ??= new Date().toISOString();
  }

  expectWrite(
    "informations d'expedition",
    await supabase.from("orders").update(patch).eq("id", orderId).select("id"),
  );

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, `/compte/commandes/${orderId}`));
}

/**
 * Confirme la réception d'un virement.
 *
 * Le virement se confirme toujours à la main : seule la banque sait que les
 * fonds sont arrivés.
 *
 * La carte, elle, est acquittée par le webhook Stripe. Tant qu'il n'est pas
 * branché, aucun règlement par carte ne pourrait jamais aboutir — d'où cette
 * confirmation manuelle de secours, ouverte seulement dans ce cas précis. Dès
 * que `STRIPE_WEBHOOK_SECRET` est renseignée, la porte se referme : laisser
 * les deux voies ouvertes inviterait à marquer payée une commande qui ne
 * l'est pas.
 */
export async function confirmPaymentReceived(formData: FormData) {
  const locale = localeOf(formData);
  const paymentId = String(formData.get("payment_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  if (!paymentId || !orderId) return;

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("method")
    .eq("id", paymentId)
    .single<{ method: string }>();

  if (!payment) return;
  if (payment.method !== "transfer" && !manualCardConfirmationAllowed()) return;

  // Le reglement est la seule ecriture dont un echec silencieux coute de
  // l'argent : la commande resterait impayee alors qu'elle est payee.
  expectWrite(
    "confirmation du reglement",
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", paymentId)
      .select("id"),
  );

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, `/compte/commandes/${orderId}`));
}

/**
 * Ajoute une étape au journal de suivi.
 *
 * La date est celle de l'événement, pas de la saisie : une étape se renseigne
 * souvent le lendemain, et c'est la date réelle qui intéresse le client.
 */
export async function addShipmentEvent(formData: FormData) {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!orderId || !label) return;

  const rawDate = String(formData.get("happened_at") ?? "").trim();
  const happenedAt = rawDate ? new Date(rawDate) : new Date();

  const supabase = await createClient();
  const { error } = await supabase.from("shipment_events").insert({
    order_id: orderId,
    label,
    location: String(formData.get("location") ?? "").trim() || null,
    happened_at: Number.isNaN(happenedAt.getTime())
      ? new Date().toISOString()
      : happenedAt.toISOString(),
  });

  // Sans cette trace, un refus de la base passait inaperçu : le formulaire se
  // vidait, la page se rechargeait, et l'étape n'était simplement jamais
  // apparue. C'est ainsi qu'une table manquante est restée invisible.
  if (error) console.error("[admin/commandes] addShipmentEvent", error);

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, `/compte/commandes/${orderId}`));
}

export async function deleteShipmentEvent(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get("id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("shipment_events").delete().eq("id", id);
  if (error) console.error("[admin/commandes] deleteShipmentEvent", error);

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, `/compte/commandes/${orderId}`));
}

/**
 * Corrige quantités et prix unitaires des lignes d'une commande.
 *
 * Elles n'étaient qu'affichées : rectifier une quantité obligeait à supprimer
 * la ligne puis à la ressaisir, en perdant au passage le rattachement au
 * produit. Le formulaire porte un champ par ligne, nommé d'après son
 * identifiant, et cette action applique ce qui a changé.
 */
export async function updateOrderItems(formData: FormData) {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) return;

  const supabase = await createClient();

  for (const [key, raw] of formData.entries()) {
    const match = /^qty_(.+)$/.exec(key);
    if (!match) continue;

    const id = match[1];
    const quantity = Math.floor(Number(String(raw).trim()));
    if (!Number.isFinite(quantity) || quantity < 1) continue;

    // Un prix vide reste vide : une commande peut attendre son chiffrage.
    const priceRaw = formData.get(`price_${id}`);
    const unitPrice = parseAmount(priceRaw);

    expectWrite(
      `ligne de commande ${id}`,
      await supabase
        .from("order_items")
        .update({ quantity, unit_price: unitPrice })
        .eq("id", id)
        .eq("order_id", orderId)
        .select("id"),
    );
  }

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, `/compte/commandes/${orderId}`));
}
