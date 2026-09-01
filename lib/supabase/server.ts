import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_NOT_CONFIGURED,
  SUPABASE_URL,
} from "./config";

/**
 * Échoue immédiatement si la configuration est absente ou factice, plutôt que
 * de laisser chaque requête attendre un serveur inexistant. Les fonctions du
 * catalogue rattrapent cette erreur et servent le catalogue de démonstration.
 */
export async function createClient() {
  // `cookies()` d'abord : sa lecture signale à Next.js que la route est
  // dynamique. Lever l'erreur avant l'aurait laissé croire que les pages de
  // l'espace client sont pré-rendables, et le build échouait dessus.
  const cookieStore = await cookies();
  if (!isSupabaseConfigured()) throw new Error(SUPABASE_NOT_CONFIGURED);

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component during rendering — the
          // middleware refreshes the session on the next request instead.
        }
      },
    },
  });
}

/**
 * Utilisateur connecté, ou `null` si la base n'est pas configurée ou
 * injoignable. À utiliser partout où l'absence de session est un cas normal
 * (en-tête public) plutôt qu'une erreur.
 */
export async function getSessionUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
