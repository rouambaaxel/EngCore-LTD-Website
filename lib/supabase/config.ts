/**
 * Détection d'une configuration Supabase réellement exploitable.
 *
 * `.env.local.example` contient des valeurs factices. Recopié tel quel sans
 * être rempli, il produit une URL qui n'existe pas : chaque appel part alors
 * en résolution DNS et n'échoue qu'au bout de plusieurs secondes. Comme le
 * proxy interroge Supabase à chaque requête et chaque page passe plusieurs
 * requêtes, une page mettait 15 à 30 secondes à s'afficher — le site
 * paraissait planté.
 *
 * On vérifie donc la configuration avant tout appel réseau : si elle est
 * absente ou factice, le site bascule immédiatement sur le catalogue de
 * démonstration au lieu d'attendre un serveur qui n'existe pas.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Valeurs de `.env.local.example`, à ne jamais prendre pour une vraie config. */
const PLACEHOLDER_KEYS = new Set(["your-anon-public-key", "..."]);

export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (PLACEHOLDER_KEYS.has(SUPABASE_ANON_KEY.trim())) return false;

  let host: string;
  try {
    host = new URL(SUPABASE_URL).hostname;
  } catch {
    return false;
  }

  // Le gabarit utilise un sous-domaine de « x » ; aucun projet réel ne s'appelle
  // ainsi (les identifiants Supabase mélangent lettres et chiffres).
  return !/^x+\./.test(host);
}

/** Message unique, pour que l'origine de la panne soit lisible dans les logs. */
export const SUPABASE_NOT_CONFIGURED =
  "Supabase n'est pas configuré : renseignez NEXT_PUBLIC_SUPABASE_URL et " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (voir README).";
