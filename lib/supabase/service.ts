import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_URL } from "./config";

/**
 * Client à clé de service, hors RLS.
 *
 * Réservé aux webhooks : quand Stripe confirme un encaissement, il n'y a pas
 * de session utilisateur, et marquer un paiement « payé » est justement ce
 * qu'aucun client n'a le droit de faire. La clé ne porte pas le préfixe
 * `NEXT_PUBLIC_` : elle ne doit jamais atteindre le navigateur.
 *
 * Renvoie `null` si elle n'est pas configurée, pour que l'appelant réponde
 * proprement plutôt que de planter.
 */
export function createServiceClient() {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!key || !isSupabaseConfigured()) return null;

  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
