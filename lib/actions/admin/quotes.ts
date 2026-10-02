"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expectWrite, logWrite } from "./write";
import { getDictionary, localePath } from "@/lib/i18n";
import { parseAmount } from "@/lib/money";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface QuoteActionState {
  error: string | null;
}

/**
 * Chiffre la demande et l'envoie au client.
 *
 * Le devis passe en « chiffré » : c'est ce statut, et lui seul, qui autorise
 * le client à répondre (voir le trigger `restrict_quote_client_update`).
 */
export async function priceAndSendQuote(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const locale = localeOf(formData);
  const quoteId = String(formData.get("id") ?? "");
  if (!quoteId) return { error: "Devis introuvable." };

  const supabase = await createClient();

  // Un devis sans compte n'a pas de destinataire : aucun espace client où le
  // déposer, personne à qui le facturer. La base refuse de toute façon la
  // transition, autant le dire ici en clair.
  const { data: owner } = await supabase
    .from("quote_requests")
    .select("client_id")
    .eq("id", quoteId)
    .maybeSingle<{ client_id: string | null }>();

  if (!owner?.client_id) {
    return { error: getDictionary(locale).admin.quoteAwaitingAccount };
  }

  const { data: items } = await supabase
    .from("quote_request_items")
    .select("id")
    .eq("quote_request_id", quoteId)
    .returns<{ id: string }[]>();

  if (!items || items.length === 0) {
    return { error: "Cette demande ne contient aucune ligne à chiffrer." };
  }

  // Toutes les lignes doivent porter un prix : un devis partiel donnerait un
  // total faux, et c'est ce total que le client paiera.
  const prices = new Map<string, number>();
  for (const item of items) {
    const price = parseAmount(formData.get(`price_${item.id}`));
    if (price === null) {
      return { error: "Renseignez un prix sur chaque ligne avant d'envoyer." };
    }
    prices.set(item.id, price);
  }

  for (const [id, unit_price] of prices) {
    const label = String(formData.get(`label_${id}`) ?? "").trim();
    const { data: touched, error: lineError } = await supabase
      .from("quote_request_items")
      .update({ unit_price, label: label || null })
      .eq("id", id)
      .select("id");

    // Ce formulaire sait afficher une erreur : la lui rendre vaut mieux
    // que lever, et evite d'envoyer un devis dont les prix n'ont pas pris.
    if (lineError || !touched || touched.length === 0) {
      return {
        error:
          "Le prix d'une ligne n'a pas pu etre enregistre. " +
          "Le devis n'a pas ete envoye.",
      };
    }
  }

  const validUntil = String(formData.get("valid_until") ?? "").trim();

  // Chaque envoi produit une version. Sans ce compteur, une discussion
  // reprise trois jours plus tard ne dirait plus quelle offre fait foi.
  const { data: current } = await supabase
    .from("quote_requests")
    .select("revision, status")
    .eq("id", quoteId)
    .single<{ revision: number; status: string }>();

  const nextRevision =
    current && current.status !== "nouveau" ? (current.revision ?? 1) + 1 : 1;

  const { error } = await supabase
    .from("quote_requests")
    .update({
      status: "chiffre",
      revision: nextRevision,
      shipping_amount: parseAmount(formData.get("shipping_amount")) ?? 0,
      vat_rate: parseAmount(formData.get("vat_rate")) ?? 0,
      valid_until: validUntil || null,
      reply_message: String(formData.get("reply_message") ?? "").trim() || null,
      quoted_at: new Date().toISOString(),
      responded_at: null,
      decline_reason: null,
    })
    .eq("id", quoteId);

  if (error) return { error: `Impossible d'envoyer le devis : ${error.message}` };

  const note = String(formData.get("reply_message") ?? "").trim();
  if (note) {
    expectWrite(
      "message joint au chiffrage",
      await supabase
        .from("quote_messages")
        .insert({
          quote_request_id: quoteId,
          author: "admin",
          body: note,
          revision: nextRevision,
        })
        .select("id"),
    );
  }

  revalidatePath(localePath(locale, "/compte/devis"));
  revalidatePath(localePath(locale, "/admin/devis"));
  revalidatePath(localePath(locale, `/admin/devis/${quoteId}`));
  return { error: null };
}

/**
 * Convertit un devis en commande.
 *
 * Appelée par l'administrateur, et par l'acceptation du client. Les prix
 * chiffrés, le port et la TVA sont recopiés sur la commande : le devis reste
 * la trace de la négociation, la commande devient la référence de facturation.
 */
export async function convertQuoteToOrder(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get("id") ?? "");
  if (!quoteId) return;

  const supabase = await createClient();
  const orderId = await createOrderFromQuote(supabase, quoteId);
  if (!orderId) return;

  revalidatePath(localePath(locale, "/admin/devis"));
  redirect(localePath(locale, `/admin/commandes/${orderId}`));
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface QuoteLine {
  product_id: string | null;
  free_text_reference: string | null;
  label: string | null;
  quantity: number;
  unit_price: number | null;
}

/**
 * Crée la commande correspondant à un devis, sans rediriger — partagée entre
 * l'action administrateur et l'acceptation par le client.
 *
 * Idempotente : un devis déjà converti renvoie la commande existante plutôt
 * que d'en créer une seconde.
 */
export async function createOrderFromQuote(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("quote_request_id", quoteId)
    .maybeSingle<{ id: string }>();
  if (existing) return existing.id;

  const { data: quote } = await supabase
    .from("quote_requests")
    .select("*, items:quote_request_items(*)")
    .eq("id", quoteId)
    .single<{
      client_id: string | null;
      message: string | null;
      product_id: string | null;
      currency: string;
      shipping_amount: number;
      vat_rate: number;
      items: QuoteLine[] | null;
    }>();

  if (!quote?.client_id) return null;

  const { data: order } = await supabase
    .from("orders")
    .insert({
      client_id: quote.client_id,
      quote_request_id: quoteId,
      notes: quote.message,
      currency: quote.currency,
      shipping_amount: quote.shipping_amount,
      vat_rate: quote.vat_rate,
    })
    .select("id")
    .single<{ id: string }>();

  if (!order) return null;

  const lines: QuoteLine[] =
    quote.items && quote.items.length > 0
      ? quote.items
      : quote.product_id
        ? [
            {
              product_id: quote.product_id,
              free_text_reference: null,
              label: null,
              quantity: 1,
              unit_price: null,
            },
          ]
        : [];

  if (lines.length > 0) {
    expectWrite(
      "report des lignes du devis",
      await supabase
        .from("order_items")
        .insert(
          lines.map((line) => ({
            order_id: order.id,
            product_id: line.product_id,
            free_text_reference: line.free_text_reference ?? line.label,
            quantity: line.quantity,
            unit_price: line.unit_price,
          })),
        )
        .select("id"),
    );
  }

  expectWrite(
    "cloture du devis converti",
    await supabase
      .from("quote_requests")
      .update({ status: "converti" })
      .eq("id", quoteId)
      .select("id"),
  );
  return order.id;
}


/**
 * Ajoute une ligne de facturation au devis.
 *
 * Les lignes venaient toutes du panier du client. Une remise, un transport,
 * une mise en caisse ou une pièce substituée n'y figurent jamais : il faut
 * pouvoir en ajouter, faute de quoi le devis ne reflète pas l'accord.
 */
export async function addQuoteLine(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!quoteId || !label) return;

  const quantityRaw = Math.floor(Number(String(formData.get("quantity") ?? "1").trim()));
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;

  const supabase = await createClient();
  expectWrite(
    "ajout d'une ligne de facturation",
    await supabase
      .from("quote_request_items")
      .insert({
        quote_request_id: quoteId,
        product_id: null,
        label,
        free_text_reference: label,
        quantity,
        unit_price: parseAmount(formData.get("unit_price")),
      })
      .select("id"),
  );

  revalidatePath(localePath(locale, `/admin/devis/${quoteId}`));
}

export async function removeQuoteLine(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get("id") ?? "");
  const lineId = String(formData.get("line_id") ?? "");
  if (!lineId) return;

  const supabase = await createClient();
  logWrite(
    "suppression d'une ligne de facturation",
    await supabase.from("quote_request_items").delete().eq("id", lineId),
  );

  revalidatePath(localePath(locale, `/admin/devis/${quoteId}`));
}

/** Réponse de l'équipe dans le fil, sans renvoyer le devis. */
export async function postQuoteMessage(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!quoteId || !body) return;

  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quote_requests")
    .select("revision")
    .eq("id", quoteId)
    .single<{ revision: number }>();

  expectWrite(
    "reponse dans le fil",
    await supabase
      .from("quote_messages")
      .insert({
        quote_request_id: quoteId,
        author: "admin",
        body,
        revision: quote?.revision ?? 1,
      })
      .select("id"),
  );

  revalidatePath(localePath(locale, `/admin/devis/${quoteId}`));
  revalidatePath(localePath(locale, `/compte/devis/${quoteId}`));
}
