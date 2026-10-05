"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { claimPendingQuotes } from "@/lib/quotes/claim";
import {
  claimPendingInvitation,
  rememberInvitationToken,
} from "@/lib/invitations/claim";
import { getDictionary, localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

export interface AuthActionState {
  error: string | null;
}

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requested = String(formData.get("next") ?? "");

  if (!isSupabaseConfigured()) return { error: t.auth.unavailable };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Un compte dont l'email n'est pas confirmé échoue ici comme un mauvais
    // mot de passe. Les confondre envoie l'utilisateur chercher une faute de
    // frappe qui n'existe pas, alors qu'il lui suffit d'ouvrir sa boîte mail.
    const unconfirmed =
      error.code === "email_not_confirmed" ||
      /email not confirmed/i.test(error.message);
    return { error: unconfirmed ? t.auth.emailNotConfirmed : t.auth.invalidCredentials };
  }

  // Une invitation laissée en suspens à l'inscription — faute de session,
  // quand la confirmation d'email est exigée — se consomme ici, à la
  // première connexion. Avant le rattachement des devis : un compte validé
  // d'office n'a pas à passer par l'écran d'attente pour les consulter.
  await claimPendingInvitation(supabase);

  // Une demande composée avant la connexion rejoint le compte qui vient de
  // s'ouvrir : sans cela, elle resterait sans destinataire et sans réponse.
  const claimed = await claimPendingQuotes(supabase);

  redirect(requested || localePath(locale, claimed > 0 ? "/compte/devis" : "/compte"));
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "");
  const contactName = String(formData.get("contact_name") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const invitation = String(formData.get("invitation") ?? "").trim();

  if (password.length < 8) {
    return { error: t.auth.passwordTooShort };
  }

  if (!isSupabaseConfigured()) return { error: t.auth.unavailable };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        company_name: companyName,
        contact_name: contactName,
        phone,
      },
    },
  });

  if (error) {
    // Supabase plafonne les emails sortants par heure. Après quelques essais,
    // l'inscription échoue sur « email rate limit exceeded » — un message qui
    // ne dit rien à un visiteur, et qui laisse croire à un compte existant.
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { error: t.auth.tooManyAttempts };
    }
    if (/already registered|already been registered/i.test(error.message)) {
      return { error: t.auth.emailAlreadyUsed };
    }
    return { error: t.auth.signUpFailed + error.message };
  }

  // Compte ouvert sur notre invitation : nous connaissions déjà ce client
  // avant de lui écrire, la validation manuelle n'aurait plus rien à
  // vérifier. La fonction contrôle elle-même que l'adresse inscrite est bien
  // celle invitée — un lien transféré n'ouvre donc rien.
  //
  // Le jeton est d'abord mis de côté, puis consommé. Si la confirmation
  // d'email est activée, l'inscription n'ouvre pas de session et la
  // consommation échoue ici : elle sera retentée à la première connexion.
  if (invitation) {
    await rememberInvitationToken(invitation);
    await claimPendingInvitation(supabase, invitation);
  }

  // Le devis composé juste avant l'inscription est la raison même du compte :
  // il le rejoint immédiatement. Sans session — lorsque la confirmation par
  // email est exigée —, le rattachement se fera à la première connexion.
  const claimed = await claimPendingQuotes(supabase);

  // Pas de session alors que le compte est créé : la confirmation d'email est
  // exigée. L'envoyer vers l'espace client le ferait rebondir sur l'écran de
  // connexion sans un mot d'explication — il faut lui dire d'ouvrir sa boîte.
  if (!data.session) {
    redirect(`${localePath(locale, "/connexion")}?confirmation=1`);
  }

  redirect(localePath(locale, claimed > 0 ? "/compte/devis" : "/compte"));
}

export async function signOut(formData: FormData) {
  const locale = localeOf(formData);
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(localePath(locale, "/"));
}
