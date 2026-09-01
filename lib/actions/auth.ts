"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
  const next = String(formData.get("next") ?? "") || localePath(locale, "/compte");

  if (!isSupabaseConfigured()) return { error: t.auth.unavailable };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t.auth.invalidCredentials };
  }

  redirect(next);
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

  if (password.length < 8) {
    return { error: t.auth.passwordTooShort };
  }

  if (!isSupabaseConfigured()) return { error: t.auth.unavailable };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
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
    return { error: t.auth.signUpFailed + error.message };
  }

  redirect(localePath(locale, "/compte"));
}

export async function signOut(formData: FormData) {
  const locale = localeOf(formData);
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(localePath(locale, "/"));
}
