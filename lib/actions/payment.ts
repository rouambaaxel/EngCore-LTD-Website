"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import {
  availablePaymentMethods,
  BASE_CURRENCY,
  currenciesFor,
  isCurrency,
  type Currency,
} from "@/lib/payments/config";
import { convert } from "@/lib/payments/fx";
import { createCheckoutSession } from "@/lib/payments/stripe";
import type { PaymentMethod } from "@/lib/types";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface PaymentActionState {
  error: string | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  client_id: string;
  payment_status: string;
}

/**
 * Démarre un règlement.
 *
 * Le montant dû n'est jamais lu depuis le formulaire : il est recalculé par
 * `public.order_total()`, la même fonction que la policy d'insertion contrôle.
 * Le client choisit seulement sa devise — le taux est appliqué ici, côté
 * serveur, et figé sur la ligne de paiement. Sans ce verrou, le cours pourrait
 * bouger entre l'affichage et l'encaissement.
 */
export async function startPayment(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const orderId = String(formData.get("order_id") ?? "");
  const method = String(formData.get("method") ?? "") as PaymentMethod;
  const rawCurrency = String(formData.get("currency") ?? BASE_CURRENCY);
  const currency: Currency = isCurrency(rawCurrency) ? rawCurrency : BASE_CURRENCY;

  if (!orderId || !["card", "transfer"].includes(method)) {
    return { error: t.payment.error };
  }
  if (!availablePaymentMethods().includes(method)) {
    return { error: t.payment.unavailable };
  }
  if (!currenciesFor(method).includes(currency)) {
    return { error: t.payment.currencyUnavailable };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t.payment.error };

  // RLS limite déjà la lecture aux commandes du client connecté.
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, client_id, payment_status")
    .eq("id", orderId)
    .single<OrderRow>();

  if (!order || order.client_id !== user.id) return { error: t.payment.error };
  if (order.payment_status === "paid") return { error: null };

  const { data: total, error: totalError } = await supabase.rpc("order_total", {
    p_order: orderId,
  });
  const baseAmount = Number(total);
  if (totalError || !Number.isFinite(baseAmount) || baseAmount <= 0) {
    return { error: t.payment.error };
  }

  let conversion;
  try {
    conversion = await convert(baseAmount, currency);
  } catch {
    return { error: t.payment.rateUnavailable };
  }

  // Une tentative en cours pour le même moyen et la même devise est réutilisée
  // plutôt que dupliquée : le client qui revient en arrière ne crée pas dix
  // lignes. Un changement de devise, lui, mérite une nouvelle ligne — le taux
  // n'est plus le même.
  const { data: pending } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("method", method)
    .eq("currency", currency)
    .eq("status", "pending")
    .maybeSingle<{ id: string }>();

  let paymentId = pending?.id ?? null;

  if (!paymentId) {
    const { data: created, error } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        method,
        status: "pending",
        amount: conversion.amount,
        currency,
        base_amount: baseAmount,
        base_currency: BASE_CURRENCY,
        exchange_rate: conversion.rate,
        fx_margin_rate: conversion.marginPercent,
        transfer_reference: method === "transfer" ? order.order_number : null,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !created) return { error: t.payment.error };
    paymentId = created.id;
  }

  revalidatePath(localePath(locale, `/compte/commandes/${orderId}`));

  // Le virement n'a rien à déclencher : les coordonnées s'affichent sur la
  // page, et l'équipe confirme à réception des fonds.
  if (method === "transfer") return { error: null };

  try {
    const url = await createCheckoutSession({
      orderId,
      paymentId,
      orderNumber: order.order_number,
      email: user.email ?? null,
      amount: conversion.amount,
      currency,
      description: t.payment.stripeDescription,
      locale,
    });
    redirect(url);
  } catch (error) {
    // `redirect()` lève volontairement : il ne faut pas la confondre avec un échec.
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: t.payment.error };
  }
}
