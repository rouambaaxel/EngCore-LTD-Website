"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import type { OrderStatus } from "@/lib/types";

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface OrderActionState {
  error: string | null;
}

export async function createOrder(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);
  const clientId = String(formData.get("client_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!clientId) {
    return { error: t.admin.selectClientError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({ client_id: clientId, notes })
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
  await supabase.from("orders").update({ status }).eq("id", orderId);

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
  revalidatePath(localePath(locale, "/admin/commandes"));
}

export async function updateOrderNotes(formData: FormData) {
  const locale = localeOf(formData);
  const orderId = String(formData.get("order_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!orderId) return;

  const supabase = await createClient();
  await supabase.from("orders").update({ notes }).eq("id", orderId);

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
  await supabase.from("order_items").insert({
    order_id: orderId,
    product_id: productId,
    free_text_reference: freeText,
    quantity,
    unit_price: unitPrice,
  });

  revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
}

export async function removeOrderItem(formData: FormData) {
  const locale = localeOf(formData);
  const itemId = String(formData.get("item_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  if (!itemId) return;

  const supabase = await createClient();
  await supabase.from("order_items").delete().eq("id", itemId);

  if (orderId) revalidatePath(localePath(locale, `/admin/commandes/${orderId}`));
}
