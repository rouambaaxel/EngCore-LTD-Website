"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface QuoteResponseState {
  error: string | null;
}

/**
 * Acceptation d'un devis par le client.
 *
 * Tout le travail est fait par `public.accept_quote()` : la propriété du
 * devis, son statut et sa validité s'y vérifient au plus près des données,
 * et la commande naît dans la même transaction. Un contrôle fait ici, dans
 * l'application, serait contournable.
 */
export async function acceptQuote(
  _prev: QuoteResponseState,
  formData: FormData,
): Promise<QuoteResponseState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);
  const quoteId = String(formData.get("id") ?? "");
  if (!quoteId) return { error: t.quotes.respondError };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_quote", { p_quote: quoteId });

  if (error || !data) {
    return { error: error?.message ?? t.quotes.respondError };
  }

  revalidatePath(localePath(locale, "/compte/devis"));
  revalidatePath(localePath(locale, "/compte/commandes"));
  redirect(localePath(locale, `/compte/commandes/${data}`));
}

/**
 * Refus d'un devis. Passe par la mise à jour classique : le trigger
 * `restrict_quote_client_update` n'autorise que le statut et le motif, et
 * seulement depuis l'état « chiffré ».
 */
export async function declineQuote(
  _prev: QuoteResponseState,
  formData: FormData,
): Promise<QuoteResponseState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);
  const quoteId = String(formData.get("id") ?? "");
  if (!quoteId) return { error: t.quotes.respondError };

  const reason = String(formData.get("reason") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("quote_requests")
    .update({ status: "refuse", decline_reason: reason || null })
    .eq("id", quoteId);

  if (error) return { error: error.message };

  revalidatePath(localePath(locale, "/compte/devis"));
  revalidatePath(localePath(locale, `/compte/devis/${quoteId}`));
  return { error: null };
}


/**
 * Le client demande une révision plutôt que d'accepter ou de refuser.
 *
 * Le devis repasse côté équipe : c'est la troisième réponse possible, et
 * celle qui permet à la discussion de continuer au lieu de s'arrêter net sur
 * un refus.
 */
export async function requestQuoteAmendment(
  _prev: QuoteResponseState,
  formData: FormData,
): Promise<QuoteResponseState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);
  const quoteId = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!quoteId) return { error: t.quotes.respondError };
  if (!body) return { error: t.quotes.amendmentEmpty };

  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quote_requests")
    .select("revision")
    .eq("id", quoteId)
    .single<{ revision: number }>();

  // Le message part d'abord : si le changement de statut échoue, la demande
  // du client n'est pas perdue et l'équipe la voit malgré tout.
  const { error: messageError } = await supabase.from("quote_messages").insert({
    quote_request_id: quoteId,
    author: "client",
    body,
    revision: quote?.revision ?? 1,
  });
  if (messageError) return { error: messageError.message };

  const { error } = await supabase
    .from("quote_requests")
    .update({ status: "amende" })
    .eq("id", quoteId);

  if (error) return { error: error.message };

  revalidatePath(localePath(locale, "/compte/devis"));
  revalidatePath(localePath(locale, `/compte/devis/${quoteId}`));
  return { error: null };
}
