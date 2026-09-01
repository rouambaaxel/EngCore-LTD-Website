"use server";

import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export interface QuoteActionState {
  error: string | null;
  success: boolean;
}

export async function submitQuoteRequest(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim() || null;

  const rawLocale = String(formData.get("locale") ?? "");
  const t = getDictionary(isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE);

  if (!email || !message) {
    return { error: t.contact.errorRequired, success: false };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("quote_requests").insert({
      client_id: user?.id ?? null,
      full_name: fullName || null,
      company_name: companyName || null,
      email,
      phone: phone || null,
      product_id: productId,
      message,
    });

    if (error) {
      return { error: t.contact.errorSend, success: false };
    }

    return { error: null, success: true };
  } catch {
    return { error: t.contact.errorUnavailable, success: false };
  }
}

/** Une ligne du panier, telle qu'envoyée par le formulaire. */
interface CartLinePayload {
  slug: string;
  quantity: number;
}

/**
 * Envoie le panier en demande de devis : une demande, puis ses lignes.
 *
 * Les slugs sont résolus en identifiants produits côté serveur — le panier
 * vient du navigateur, on ne lui fait pas confiance pour fournir des ids.
 */
export async function submitCartQuote(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const t = getDictionary(isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE);

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  let lines: CartLinePayload[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("lines") ?? "[]"));
    if (Array.isArray(parsed)) {
      lines = parsed.flatMap((item): CartLinePayload[] => {
        const slug = typeof item?.slug === "string" ? item.slug : "";
        const quantity = Math.floor(Number(item?.quantity));
        if (!slug || !Number.isFinite(quantity) || quantity < 1) return [];
        return [{ slug, quantity }];
      });
    }
  } catch {
    lines = [];
  }

  if (lines.length === 0) {
    return { error: t.cart.errorEmpty, success: false };
  }
  if (!email) {
    return { error: t.contact.errorRequired, success: false };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Résolution des slugs en identifiants produits.
    const { data: products } = await supabase
      .from("products")
      .select("id, slug")
      .in(
        "slug",
        lines.map((line) => line.slug),
      )
      .returns<{ id: string; slug: string }[]>();

    const idBySlug = new Map((products ?? []).map((product) => [product.slug, product.id]));

    const { data: quote, error } = await supabase
      .from("quote_requests")
      .insert({
        client_id: user?.id ?? null,
        full_name: fullName || null,
        company_name: companyName || null,
        email,
        phone: phone || null,
        message: message || null,
      })
      .select("id")
      .single();

    if (error || !quote) {
      return { error: t.contact.errorSend, success: false };
    }

    const { error: itemsError } = await supabase.from("quote_request_items").insert(
      lines.map((line) => ({
        quote_request_id: quote.id,
        product_id: idBySlug.get(line.slug) ?? null,
        // Produit introuvable en base : on conserve au moins la référence demandée.
        free_text_reference: idBySlug.has(line.slug) ? null : line.slug,
        quantity: line.quantity,
      })),
    );

    if (itemsError) {
      return { error: t.contact.errorSend, success: false };
    }

    return { error: null, success: true };
  } catch {
    return { error: t.contact.errorUnavailable, success: false };
  }
}
