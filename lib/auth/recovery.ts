import "server-only";

/**
 * Marque d'une réinitialisation de mot de passe en cours.
 *
 * Le lien reçu par email ouvre une session ordinaire : rien, côté Supabase,
 * ne la distingue d'une connexion classique. Sans cette marque, la page « nouveau
 * mot de passe » accepterait n'importe quelle session — et un poste laissé
 * ouvert suffirait à changer le mot de passe sans connaître l'actuel, ce que
 * l'espace client refuse justement d'autoriser.
 *
 * Posée par /api/auth/recovery après vérification du lien, elle porte
 * l'identifiant du compte concerné, n'est pas lisible par le navigateur, et
 * expire vite.
 */
export const RECOVERY_COOKIE = "pw_recovery";

/** Durée laissée pour choisir le nouveau mot de passe, en secondes. */
export const RECOVERY_MAX_AGE = 15 * 60;

export const RECOVERY_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: RECOVERY_MAX_AGE,
};
