import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// S-03: Helpers de validación — no pueden importar desde @/lib/env
// porque el middleware corre en el Edge runtime (bundle separado).
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  return url;
}
function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() verifies the token with Supabase servers on every request.
  // If the refresh token is invalid/expired, clear the session cookies
  // and redirect to login instead of leaving a broken session in place.
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // AuthApiError code for an invalid/revoked refresh token.
      // Clear all auth cookies so the browser doesn't keep retrying.
      if (
        error.message.toLowerCase().includes("refresh token") ||
        ("code" in error && error.code === "refresh_token_not_found")
      ) {
        const clearResponse = NextResponse.redirect(new URL("/login", request.url));
        request.cookies.getAll().forEach(({ name }) => {
          if (name.startsWith("sb-")) {
            clearResponse.cookies.delete(name);
          }
        });
        return clearResponse;
      }
    } else {
      user = data.user;
    }
  } catch {
    // Network error — let the request continue; middleware should be resilient.
  }

  // AUDIT FIX H-4: Allowlist de rutas públicas en vez de blocklist de rutas privadas.
  // Ventaja: cualquier ruta nueva queda protegida automáticamente sin tener que
  // acordarse de añadirla aquí (antes /agenda y /onboarding quedaban expuestas).
  const PUBLIC_PATHS = [
    "/",
    "/login",
    "/registro",
    "/terminos",
    "/privacidad",
    "/offline",
  ];

  // Una ruta es pública si coincide exactamente con un path de la allowlist
  // o si empieza con un prefijo de ruta pública con sub-rutas.
  const isPublicRoute =
    PUBLIC_PATHS.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith("/login/") ||
    request.nextUrl.pathname.startsWith("/registro/") ||
    request.nextUrl.pathname.startsWith("/terminos/") ||
    request.nextUrl.pathname.startsWith("/privacidad/");

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/registro");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
