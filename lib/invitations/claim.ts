import "server-only";
import { cookies } from "next/headers";

/**
 * Consommation d'une invitation, à l'inscription ou à la première connexion.
 *
 * Tant que la confirmation d'email est désactivée, une inscription ouvre une
 * session immédiatement et l'invitation se consomme dans la foulée. Si elle
 * est activée, il n'y a plus de session à ce moment-là : le compte existe,
 * mais personne n'est connecté, et `accept_invitation` — réservée aux
 * connectés — ne peut rien faire.
 *
 * Le jeton attend donc dans un cookie, et la consommation est retentée à
 * chaque connexion jusqu'à ce qu'elle aboutisse. Sans ce report, activer la
 * confirmation d'email aurait silencieusement cessé de valider les comptes
 * invités : ils seraient repartis dans la file d'attente manuelle, sans que
 * rien ne le signale.
 */

const COOKIE = "engcore_invitation";

/** Trente jours, comme la validité de l'invitation elle-même. */
const MAX_AGE = 60 * 60 * 24 * 30;

function clean(raw: string | undefined): string | null {
  if (!raw) return null;
  return /^[A-Za-z0-9_-]{16,64}$/.test(raw) ? raw : null;
}

export async function rememberInvitationToken(token: string): Promise<void> {
  if (!clean(token)) return;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function pendingInvitationToken(): Promise<string | null> {
  const store = await cookies();
  return clean(store.get(COOKIE)?.value);
}

type SupabaseClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Tente de consommer l'invitation en attente.
 *
 * Le cookie n'est effacé qu'en cas de succès : un échec peut venir d'une
 * session pas encore ouverte, et la tentative suivante doit pouvoir réessayer.
 * Une invitation expirée ou déjà utilisée rend `false` et finira par
 * disparaître d'elle-même avec le cookie.
 *
 * À appeler depuis une action serveur, seul endroit où Next.js autorise
 * l'effacement d'un cookie.
 */
export async function claimPendingInvitation(
  supabase: SupabaseClient,
  explicitToken?: string,
): Promise<boolean> {
  const store = await cookies();
  const token = clean(explicitToken) ?? clean(store.get(COOKIE)?.value);
  if (!token) return false;

  try {
    const { data, error } = await supabase.rpc("accept_invitation", {
      p_token: token,
    });
    if (error) {
      console.error("[auth] accept_invitation", error);
      return false;
    }
    if (data !== true) return false;

    store.delete(COOKIE);
    return true;
  } catch {
    return false;
  }
}
