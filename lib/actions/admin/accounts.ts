"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

/** Langue transmise par le formulaire ; repli sur la langue par défaut. */
function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Ouvre l'accès à l'espace client.
 *
 * Les policies laissent déjà passer le seul administrateur ; on renseigne en
 * plus qui a validé et quand, pour qu'une ouverture de compte reste traçable.
 */
export async function approveAccount(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user?.id ?? null,
      rejection_reason: null,
    })
    .eq("id", id);

  revalidatePath(localePath(locale, "/admin/comptes"));
}

export async function rejectAccount(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reason = String(formData.get("reason") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      status: "rejected",
      approved_at: null,
      approved_by: null,
      rejection_reason: reason || null,
    })
    .eq("id", id);

  revalidatePath(localePath(locale, "/admin/comptes"));
}
