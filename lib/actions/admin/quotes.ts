"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function markQuoteRequestTreated(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("quote_requests").update({ status: "traite" }).eq("id", id);

  revalidatePath(localePath(locale, "/admin/devis"));
}

export async function convertQuoteToOrder(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get("id") ?? "");
  if (!quoteId) return;

  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quote_requests")
    .select("*, items:quote_request_items(*)")
    .eq("id", quoteId)
    .single();

  if (!quote || !quote.client_id) return;

  const { data: order } = await supabase
    .from("orders")
    .insert({ client_id: quote.client_id, notes: quote.message })
    .select("id")
    .single();

  if (!order) return;

  // Les lignes du panier priment ; à défaut, le produit unique de la demande.
  const lines: { product_id: string | null; free_text_reference: string | null; quantity: number }[] =
    quote.items && quote.items.length > 0
      ? quote.items.map((item: { product_id: string | null; free_text_reference: string | null; quantity: number }) => ({
          product_id: item.product_id,
          free_text_reference: item.free_text_reference,
          quantity: item.quantity,
        }))
      : quote.product_id
        ? [{ product_id: quote.product_id, free_text_reference: null, quantity: 1 }]
        : [];

  if (lines.length > 0) {
    await supabase
      .from("order_items")
      .insert(lines.map((line) => ({ ...line, order_id: order.id })));
  }

  await supabase.from("quote_requests").update({ status: "converti" }).eq("id", quoteId);

  revalidatePath(localePath(locale, "/admin/devis"));
  redirect(localePath(locale, `/admin/commandes/${order.id}`));
}
