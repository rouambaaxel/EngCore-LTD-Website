"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/payments/config";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
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
  /** Le message est parti depuis la boîte de la société. */
  sent: boolean;
  /** Envoi tenté et raté : l'invitation existe, le lien reste à transmettre. */
  sendError: string | null;
}

/*
  L'état initial vit dans le composant, pas ici : un fichier « use server »
  n'exporte que des fonctions async, et en exporter une constante fait échouer
  le rendu de la page entière.
*/

/** Champs d'un échec : rien n'a été créé, rien n'est parti. Non exporté. */
const NOTHING = { link: null, email: null, sent: false, sendError: null } as const;

/** Grossier à dessein : refuser une adresse valide coûte plus cher que l'inverse. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Crée une invitation, l'envoie, et rend le lien.
 *
 * L'envoi part de sales@engcoreltd.com lorsque le SMTP est configuré (voir
 * lib/email/send.ts), dans la langue choisie pour le client — qui n'est pas
 * forcément celle de l'écran d'administration. Sans configuration, ou si
 * l'envoi échoue, l'invitation reste créée et l'écran rend le lien à
 * transmettre à la main, comme avant : un serveur de mail en panne ne doit
 * pas empêcher d'inviter.
 */
export async function createInvitation(
  _prev: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!looksLikeEmail(email)) {
    return { error: t.admin.inviteBadEmail, ...NOTHING };
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
    return { error: t.admin.inviteAlreadyPending, ...NOTHING };
  }

  const token = randomBytes(24).toString("base64url");

  const rawInviteLocale = String(formData.get("invite_locale") ?? "");
  const inviteLocale = isLocale(rawInviteLocale) ? rawInviteLocale : locale;

  // `.select()` : sans lui, une policy qui écarte l'insertion passerait pour
  // un succès (voir lib/actions/admin/write.ts).
  const { data: inserted, error } = await supabase.from("account_invitations").insert({
    email,
    token,
    company_name: String(formData.get("company_name") ?? "").trim() || null,
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    invited_by: user?.id ?? null,
  }).select("id");

  if (error) {
    return { error: `${t.admin.inviteFailed}${error.message}`, ...NOTHING };
  }
  if (!inserted || inserted.length === 0) {
    console.error("[admin/invitations] insert : aucune ligne créée");
    return { error: `${t.admin.inviteFailed}${t.admin.inviteNoRow}`, ...NOTHING };
  }

  revalidatePath(localePath(locale, "/admin/invitations"));

  const link = `${siteUrl()}${localePath(inviteLocale, "/inscription")}?invitation=${token}`;

  let sent = false;
  let sendError: string | null = null;
  // Seul l'écran des invitations demande l'envoi. Depuis une commande sans
  // compte, l'administrateur écrit un message qui réunit suivi et accès :
  // envoyer en plus l'invitation seule ferait deux emails pour un client.
  const wantsEmail = formData.get("send_email") === "1";
  if (wantsEmail && isEmailConfigured()) {
    const mail = getDictionary(inviteLocale).admin;
    const result = await sendEmail({
      to: email,
      subject: mail.inviteMailSubject,
      text: mail.inviteMailBody.replace("{lien}", link),
    });
    if (result.ok) sent = true;
    else sendError = `${t.admin.inviteSendFailed}${result.error}`;
  }

  return { error: null, link, email, sent, sendError };
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
