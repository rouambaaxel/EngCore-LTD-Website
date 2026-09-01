"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export interface ProfileActionState {
  error: string | null;
  success: boolean;
}

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const t = getDictionary(isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.account.mustBeSignedIn, success: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      company_name: String(formData.get("company_name") ?? "").trim() || null,
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: t.account.profileError, success: false };
  }

  revalidatePath(`/${rawLocale || DEFAULT_LOCALE}/compte/profil`);
  return { error: null, success: true };
}
