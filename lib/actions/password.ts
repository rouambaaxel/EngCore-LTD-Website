"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export interface PasswordActionState {
  error: string | null;
  success: boolean;
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
