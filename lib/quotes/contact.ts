import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Coordonnées du visiteur connecté, telles que les formulaires de devis les
 * affichent.
 *
 * `accountHref` mène à la fiche profil : c'est là qu'on corrige une adresse,
 * pas dans le formulaire de demande — sans quoi deux versions des coordonnées
 * circuleraient, et l'action serveur ne retient de toute façon que celles du
 * compte.
 */
export interface SignedInContact {
  email: string;
  contactName: string | null;
  companyName: string | null;
  phone: string | null;
  accountHref: string;
}

/**
 * Renvoie `null` pour un visiteur anonyme — cas normal : le panier et le
 * formulaire de contact restent ouverts sans compte, un prospect doit pouvoir
 * composer sa demande avant d'en ouvrir un.
 */
export async function getSignedInContact(
  accountHref: string,
): Promise<SignedInContact | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, contact_name, phone")
      .eq("id", user.id)
      .maybeSingle<{
        company_name: string | null;
        contact_name: string | null;
        phone: string | null;
      }>();

    return {
      email: user.email ?? "",
      contactName: profile?.contact_name ?? null,
      companyName: profile?.company_name ?? null,
      phone: profile?.phone ?? null,
      accountHref,
    };
  } catch {
    return null;
  }
}
