import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Rattachement d'une demande de devis composée sans compte.
 *
 * Un visiteur peut remplir son panier et décrire son besoin sans s'inscrire —
 * lui demander un compte avant de savoir s'il sera servi le ferait partir.
 * Mais la réponse, elle, a besoin d'un destinataire : c'est dans l'espace
 * client que le chiffrage est déposé, discuté, accepté puis payé.
 *
 * La demande attend donc son compte. Le lien se fait par un jeton tiré au sort
 * à la composition et gardé dans un cookie httpOnly, jamais par l'adresse
 * email : celle-ci n'est pas vérifiée, et rattacher par email reviendrait à
 * offrir les demandes d'autrui à qui saurait deviner une adresse.
 */

const COOKIE = "engcore_devis";

/** Trente jours : le temps qu'un acheteur revienne valider son inscription. */
const MAX_AGE = 60 * 60 * 24 * 30;

/** Au-delà, ce n'est plus un acheteur : la fonction SQL refuse le lot. */
const MAX_TOKENS = 10;

export function newClaimToken(): string {
  return randomBytes(24).toString("base64url");
}

function parse(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(".")
    .filter((token) => /^[A-Za-z0-9_-]{16,64}$/.test(token))
    .slice(-MAX_TOKENS);
}

/**
 * Garde le jeton pour la prochaine inscription.
 *
 * Plusieurs demandes peuvent s'accumuler avant que le visiteur se décide :
 * elles seront toutes rattachées d'un coup.
 */
export async function rememberClaimToken(token: string): Promise<void> {
  const store = await cookies();
  const tokens = [...parse(store.get(COOKIE)?.value), token].slice(-MAX_TOKENS);

  store.set(COOKIE, tokens.join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function pendingClaimTokens(): Promise<string[]> {
  const store = await cookies();
  return parse(store.get(COOKIE)?.value);
}

type SupabaseClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Rattache au compte connecté les demandes composées avant l'inscription.
 *
 * À appeler depuis une action serveur, seul endroit où Next.js autorise
 * l'effacement du cookie. Silencieuse en cas d'échec : une demande non
 * rattachée reste visible côté back-office, alors qu'une erreur ici
 * empêcherait la connexion elle-même.
 */
export async function claimPendingQuotes(supabase: SupabaseClient): Promise<number> {
  const store = await cookies();
  const tokens = parse(store.get(COOKIE)?.value);
  if (tokens.length === 0) return 0;

  try {
    const { data, error } = await supabase.rpc("claim_quote_requests", {
      p_tokens: tokens,
    });
    if (error) return 0;

    store.delete(COOKIE);
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}
