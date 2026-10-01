"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/payments/config";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface InvitationState {
  error: string | null;
  /** Lien à transmettre, renvoyé une fois pour que l'écran puisse le copier. */
  link: string | null;
  email: string | null;
}

/*
  L'état initial vit dans le composant, pas ici : un fichier « use server »
  n'exporte que des fonctions async, et en exporter une constante fait échouer
  le rendu de la page entière.
*/

/** Grossier à dessein : refuser une adresse valide coûte plus cher que l'inverse. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Crée une invitation et rend le lien à transmettre.
 *
 * Le lien n'est pas envoyé par nos soins : aucun service d'envoi n'est
 * raccordé, et la messagerie intégrée de Supabase plafonne à quelques
 * messages par heure — de quoi faire échouer une campagne d'invitations sans
 * prévenir. L'écran rend donc le lien, à coller dans le message que
 * l'administrateur est de toute façon en train d'écrire. Son adresse
 * d'expédition arrive aussi mieux à destination que la nôtre.
 */
export async function createInvitation(
  _prev: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!looksLikeEmail(email)) {
    return { error: t.admin.inviteBadEmail, link: null, email: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Une invitation court déjà pour cette adresse : en créer une seconde
  // laisserait deux liens valides et deux lignes à suivre pour un seul client.
  const { data: existing } = await supabase
    .from("account_invitations")
    .select("id")
    .ilike("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<{ id: string }>();

  if (existing) {
    return { error: t.admin.inviteAlreadyPending, link: null, email: null };
  }

  const token = randomBytes(24).toString("base64url");

  const { error } = await supabase.from("account_invitations").insert({
    email,
    token,
    company_name: String(formData.get("company_name") ?? "").trim() || null,
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    invited_by: user?.id ?? null,
  });

  if (error) {
    return { error: `${t.admin.inviteFailed}${error.message}`, link: null, email: null };
  }

  revalidatePath(localePath(locale, "/admin/invitations"));
  return {
    error: null,
    link: `${siteUrl()}${localePath(locale, "/inscription")}?invitation=${token}`,
    email,
  };
}

/** Annule une invitation non encore utilisée : le lien cesse de fonctionner. */
export async function revokeInvitation(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("account_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("accepted_at", null);

  if (error) console.error("[admin/invitations] revoke", error);

  revalidatePath(localePath(locale, "/admin/invitations"));
}
