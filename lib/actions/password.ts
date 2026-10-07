"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { siteUrl } from "@/lib/payments/config";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export interface PasswordActionState {
  error: string | null;
  success: boolean;
}

/**
 * Envoi du lien « mot de passe oublié ».
 *
 * La réponse est la même que l'adresse ait un compte ou non : sinon ce
 * formulaire servirait à vérifier qui est client. Seule la saturation de
 * l'envoi est signalée, puisqu'elle concerne tout le monde.
 *
 * L'appel part du serveur, et le client Supabase y pose dans le navigateur le
 * vérificateur PKCE : le lien reçu ne s'échange contre une session que dans
 * ce même navigateur. Un lien ouvert ailleurs échoue proprement, avec un
 * message qui le dit.
 */
export async function requestPasswordReset(
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: null, success: false };
  if (!isSupabaseConfigured()) return { error: t.auth.unavailable, success: false };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/api/auth/recovery?locale=${locale}`,
    });
    if (error && (error.code === "over_email_send_rate_limit" || error.status === 429)) {
      return { error: t.auth.tooManyAttempts, success: false };
    }
    if (error) console.error("[password] reset request", error.message);
  } catch (err) {
    console.error("[password] reset request", err);
    return { error: t.auth.unavailable, success: false };
  }

  return { error: null, success: true };
}

/**
 * Enregistre le nouveau mot de passe, au retour du lien reçu par email.
 *
 * Exige la marque posée par /api/auth/recovery, et qu'elle désigne le compte
 * connecté : une session ordinaire ne suffit pas (voir lib/auth/recovery.ts).
 */
export async function completePasswordReset(
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (next.length < 8) return { error: t.auth.passwordTooShort, success: false };
  if (next !== confirm) return { error: t.auth.newPasswordMismatch, success: false };
  if (!isSupabaseConfigured()) return { error: t.auth.unavailable, success: false };

  const cookieStore = await cookies();
  const marker = cookieStore.get(RECOVERY_COOKIE)?.value;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !marker || marker !== user.id) {
      return { error: t.auth.newPasswordExpired, success: false };
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      return { error: t.auth.newPasswordFailed + error.message, success: false };
    }
  } catch {
    return { error: t.auth.unavailable, success: false };
  }

  // Usage unique : la marque ne doit pas permettre un second changement.
  cookieStore.delete(RECOVERY_COOKIE);
  redirect(localePath(locale, "/compte"));
}

/**
 * Changement de mot de passe depuis l'espace client.
 *
 * Le mot de passe actuel est redemandé, et vérifié. Supabase ne l'exige pas —
 * une session ouverte suffit à son API — mais un poste laissé déverrouillé
 * permettrait alors à n'importe qui de changer le mot de passe et d'enfermer
 * dehors le titulaire du compte. Le coût est une saisie de plus ; le gain est
 * qu'une session volée ne donne pas le compte.
 */
export async function updatePassword(
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const t = getDictionary(isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE);

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !next) {
    return { error: t.account.passwordAllFields, success: false };
  }
  if (next.length < 8) {
    return { error: t.auth.passwordTooShort, success: false };
  }
  if (next !== confirm) {
    return { error: t.account.passwordMismatch, success: false };
  }
  if (next === current) {
    return { error: t.account.passwordUnchanged, success: false };
  }
  if (!isSupabaseConfigured()) {
    return { error: t.auth.unavailable, success: false };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return { error: t.account.mustBeSignedIn, success: false };
    }

    // Vérification du mot de passe actuel. Réussie, elle renouvelle la session
    // du même utilisateur — sans effet de bord pour lui.
    const { error: reauth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (reauth) {
      return { error: t.account.passwordWrong, success: false };
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      return { error: t.account.passwordFailed + error.message, success: false };
    }

    return { error: null, success: true };
  } catch {
    return { error: t.auth.unavailable, success: false };
  }
}
