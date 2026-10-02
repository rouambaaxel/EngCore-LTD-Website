import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALES, pickLocale } from "@/lib/i18n/config";
import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/config";

/** Cookie mémorisant la langue choisie via le sélecteur. */
const LOCALE_COOKIE = "locale";

/** Seule page de l'espace client ouverte à un compte non encore validé. */
const WAITING_ROUTE = "/compte/en-attente";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const segments = path.split("/").filter(Boolean);
  const first = segments[0] ?? "";

  // --- Redirection vers une URL localisée ------------------------------
  if (!isLocale(first)) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      saved && isLocale(saved)
        ? saved
        : pickLocale(request.headers.get("accept-language"));

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${path === "/" ? "" : path}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  // Chemin sans le préfixe de langue, pour les tests de route ci-dessous.
  const pathWithoutLocale = `/${segments.slice(1).join("/")}`;

  let supabaseResponse = NextResponse.next({ request });

  const isClientRoute = pathWithoutLocale.startsWith("/compte");
  const isAdminRoute = pathWithoutLocale.startsWith("/admin");

  // Sans configuration Supabase valide, interroger l'authentification ferait
  // attendre chaque page le temps d'un DNS qui n'aboutit pas. On considère
  // simplement qu'il n'y a pas de session : la vitrine reste consultable et
  // les espaces protégés renvoient vers la connexion, comme il se doit.
  if (isSupabaseConfigured()) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if ((isClientRoute || isAdminRoute) && !user) {
      return redirectToSignIn(request, locale, path);
    }

    if ((isClientRoute || isAdminRoute) && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

      const isAdmin = profile?.role === "admin";

      if (isAdminRoute && !isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/compte`;
        return NextResponse.redirect(url);
      }

      // Les comptes sont validés à la main. Tant que ce n'est pas fait, seule
      // la page d'attente est accessible — sans quoi la validation ne
      // servirait à rien. Un administrateur passe outre.
      const approved = isAdmin || profile?.status === "approved";
      if (isClientRoute && !approved && pathWithoutLocale !== WAITING_ROUTE) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${WAITING_ROUTE}`;
        return NextResponse.redirect(url);
      }

      // À l'inverse, un compte validé n'a plus rien à faire sur cet écran.
      if (approved && pathWithoutLocale === WAITING_ROUTE) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/compte`;
        return NextResponse.redirect(url);
      }
    }
  } else if (isClientRoute || isAdminRoute) {
    return redirectToSignIn(request, locale, path);
  }

  // On retient la langue courante pour les prochaines visites.
  supabaseResponse.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return supabaseResponse;
}

function redirectToSignIn(request: NextRequest, locale: string, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/connexion`;
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // `api/` est exclu : préfixer un webhook de la langue le rendrait
    // introuvable, et Stripe n'a pas de langue.
    //
    // `robots.txt` et `sitemap.xml` le sont aussi, et pour la même raison en
    // apparence seulement : un moteur de recherche les demande à la racine,
    // sans préfixe, et n'en cherche jamais de version localisée. Redirigés
    // vers `/fr/robots.txt`, ils devenaient introuvables — le site n'avait
    // donc aucun plan de site exploitable, quoi qu'on y écrive.
    // Le plan de site est découpé en tranches servies sous `sitemap/0.xml` :
    // l'exclusion doit couvrir le dossier, pas seulement `sitemap.xml`.
    "/((?!api/|robots\\.txt|sitemap(?:\\.xml|/)|_next/static|_next/image|favicon.ico|images/|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export { LOCALES, DEFAULT_LOCALE };
