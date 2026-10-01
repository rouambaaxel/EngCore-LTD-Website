"use server";

import { createClient } from "@/lib/supabase/server";
import { newClaimToken, rememberClaimToken } from "@/lib/quotes/claim";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export interface QuoteActionState {
  error: string | null;
  success: boolean;
  /**
   * Demande enregistrée sans compte : elle attend l'inscription de son auteur
   * pour qu'une réponse puisse lui être adressée.
   */
  requiresAccount?: boolean;
  /** Numéro lisible (DEV-00012), à rappeler au visiteur. */
  reference?: string | null;
}

/** Une ligne du panier, telle qu'envoyée par le formulaire. */
interface CartLinePayload {
  slug: string;
  quantity: number;
}

interface SubmitResult {
  quote_id: string;
  quote_reference: string | null;
  requires_account: boolean;
}

/**
 * Dépose la demande.
 *
 * Tout passe par `submit_quote_request` : c'est elle qui décide du
 * propriétaire et du statut, et qui résout les références du panier. Le
 * navigateur fournit des slugs et des coordonnées, jamais un identifiant de
 * compte ni un statut — sans quoi n'importe qui s'attribuerait un devis déjà
 * accepté.
 */
async function deposit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    email: string;
    fullName: string | null;
    companyName: string | null;
    phone: string | null;
    message: string | null;
    productId: string | null;
    lines: CartLinePayload[];
    claimToken: string | null;
  },
): Promise<SubmitResult | null> {
  const { data, error } = await supabase.rpc("submit_quote_request", {
    p_email: payload.email,
    p_message: payload.message,
    p_full_name: payload.fullName,
    p_company_name: payload.companyName,
    p_phone: payload.phone,
    p_product_id: payload.productId,
    p_lines: payload.lines,
    p_claim_token: payload.claimToken,
  });

  if (error || !data) return null;

  // La fonction renvoie une table : PostgREST en fait un tableau d'une ligne.
  const rows = (Array.isArray(data) ? data : [data]) as SubmitResult[];
  return rows[0] ?? null;
}

/** Coordonnées à retenir : celles de la session priment sur le formulaire. */
async function contactOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  typed: {
    email: string;
    fullName: string;
    companyName: string;
    phone: string;
  },
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      signedIn: false,
      email: typed.email,
      fullName: typed.fullName || null,
      companyName: typed.companyName || null,
      phone: typed.phone || null,
    };
  }

  // Un client connecté n'a pas à ressaisir ce que son compte contient déjà.
  // Ses coordonnées viennent de la session, jamais du formulaire : elles sont
  // plus fiables, et un visiteur ne peut pas déposer une demande sous
  // l'identité d'un autre.
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, contact_name, phone")
    .eq("id", user.id)
    .maybeSingle<{
      company_name: string | null;
      contact_name: string | null;
      phone: string | null;
    }>();

  return {
    signedIn: true,
    email: user.email ?? typed.email,
    fullName: profile?.contact_name ?? null,
    companyName: profile?.company_name ?? null,
    phone: profile?.phone ?? null,
  };
}

export async function submitQuoteRequest(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const t = getDictionary(isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE);

  const typed = {
    email: String(formData.get("email") ?? "").trim(),
    fullName: String(formData.get("full_name") ?? "").trim(),
    companyName: String(formData.get("company_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  };
  const message = String(formData.get("message") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim() || null;

  if (!message) {
    return { error: t.contact.errorRequired, success: false };
  }

  try {
    const supabase = await createClient();
    const contact = await contactOf(supabase, typed);
    if (!contact.email) {
      return { error: t.contact.errorRequired, success: false };
    }

    const claimToken = contact.signedIn ? null : newClaimToken();
    const result = await deposit(supabase, {
      email: contact.email,
      fullName: contact.fullName,
      companyName: contact.companyName,
      phone: contact.phone,
      message,
      productId,
      lines: [],
      claimToken,
    });

    if (!result) return { error: t.contact.errorSend, success: false };
    if (claimToken) await rememberClaimToken(claimToken);

    return {
      error: null,
      success: true,
      requiresAccount: result.requires_account,
      reference: result.quote_reference,
    };
  } catch {
    return { error: t.contact.errorUnavailable, success: false };
  }
}

/**
 * Envoie le panier en demande de devis.
 *
 * Les slugs sont résolus en identifiants produits côté base — le panier vient
 * du navigateur, on ne lui fait pas confiance pour fournir des ids.
 */
export async function submitCartQuote(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const t = getDictionary(isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE);

  const typed = {
    email: String(formData.get("email") ?? "").trim(),
    fullName: String(formData.get("full_name") ?? "").trim(),
    companyName: String(formData.get("company_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  };
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

  try {
    const supabase = await createClient();
    const contact = await contactOf(supabase, typed);
    if (!contact.email) {
      return { error: t.contact.errorRequired, success: false };
    }

    const claimToken = contact.signedIn ? null : newClaimToken();
    const result = await deposit(supabase, {
      email: contact.email,
      fullName: contact.fullName,
      companyName: contact.companyName,
      phone: contact.phone,
      message: message || null,
      productId: null,
      lines,
      claimToken,
    });

    if (!result) return { error: t.contact.errorSend, success: false };
    if (claimToken) await rememberClaimToken(claimToken);

    return {
      error: null,
      success: true,
      requiresAccount: result.requires_account,
      reference: result.quote_reference,
    };
  } catch {
    return { error: t.contact.errorUnavailable, success: false };
  }
}
