import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface InvitationDetails {
  token: string;
  email: string;
  companyName: string | null;
  contactName: string | null;
}

interface DetailsRow {
  email: string;
  company_name: string | null;
  contact_name: string | null;
}

/**
 * Détails affichables d'une invitation, ou `null`.
 *
 * `null` couvre indifféremment le jeton inventé, expiré, révoqué et déjà
 * utilisé : le formulaire d'inscription se présente alors normalement, comme
 * si aucun lien n'avait été suivi. Distinguer les cas apprendrait seulement
 * quels jetons existent.
 */
export async function getInvitation(token: string): Promise<InvitationDetails | null> {
  const trimmed = token.trim();
  if (trimmed.length < 16 || trimmed.length > 100) return null;
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("invitation_details", {
      p_token: trimmed,
    });
    if (error || !data) return null;

    const rows = (Array.isArray(data) ? data : [data]) as DetailsRow[];
    const row = rows[0];
    if (!row?.email) return null;

    return {
      token: trimmed,
      email: row.email,
      companyName: row.company_name,
      contactName: row.contact_name,
    };
  } catch {
    return null;
  }
}
