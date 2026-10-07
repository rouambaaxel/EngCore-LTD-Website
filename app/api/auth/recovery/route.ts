import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RECOVERY_COOKIE, RECOVERY_COOKIE_OPTIONS } from "@/lib/auth/recovery";
import { localePath } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

/**
 * Retour du lien « mot de passe oublié ».
 *
 * Sous `api/` parce que le proxy n'y ajoute pas de préfixe de langue : la
 * langue voyage donc en paramètre. Une route plutôt qu'une page parce qu'il
 * faut poser des cookies — la session, puis la marque de réinitialisation —,
 * ce qu'un rendu de page ne peut pas faire.
 *
 * Deux formes de lien sont acceptées :
 *   - `?code=` : le modèle d'email par défaut de Supabase. L'échange exige le
 *     vérificateur posé dans le navigateur lors de la demande.
 *   - `?token_hash=&type=recovery` : un modèle d'email personnalisé. Il
 *     fonctionne depuis n'importe quel navigateur.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawLocale = params.get("locale") ?? "";
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const failure = NextResponse.redirect(
    new URL(`${localePath(locale, "/mot-de-passe-oublie")}?lien=invalide`, request.url),
  );
  if (!isSupabaseConfigured()) return failure;

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  try {
    const supabase = await createClient();

    let userId: string | null = null;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error("[auth/recovery] code", error.message);
      userId = data.user?.id ?? null;
    } else if (tokenHash && type === "recovery") {
      const { data, error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });
      if (error) console.error("[auth/recovery] token_hash", error.message);
      userId = data.user?.id ?? null;
    }

    if (!userId) return failure;

    const cookieStore = await cookies();
    cookieStore.set(RECOVERY_COOKIE, userId, RECOVERY_COOKIE_OPTIONS);
  } catch (err) {
    console.error("[auth/recovery]", err);
    return failure;
  }

  return NextResponse.redirect(
    new URL(localePath(locale, "/mot-de-passe/nouveau"), request.url),
  );
}
