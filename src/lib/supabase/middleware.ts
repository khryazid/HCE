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

// ═══════════════════════════════════════════════════════════════
// ROLE → DASHBOARD REDIRECT MAP
// Duplicated from route-guard.ts because Edge runtime can't import
// from @/lib/guards/route-guard in all cases.
// ═══════════════════════════════════════════════════════════════
const ROLE_DASHBOARDS: Record<string, string> = {
  owner:        "/dashboard",
  doctor:       "/dashboard",
  assistant:    "/agenda",
  clinic_admin: "/administracion",
  receptionist: "/recepcion",
  lab:          "/laboratorio",
  imaging:      "/imagen",
  surgery:      "/cirugia",
  // Legacy compat
  admin:        "/dashboard",
};

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
  const PUBLIC_PATHS = [
    "/",
    "/login",
    "/registro",
    "/terminos",
    "/privacidad",
    "/offline",
    "/docs",
    "/planes",
    "/sin-plan",
  ];

  const isPublicRoute =
    PUBLIC_PATHS.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith("/login/") ||
    request.nextUrl.pathname.startsWith("/registro/") ||
    request.nextUrl.pathname.startsWith("/terminos/") ||
    request.nextUrl.pathname.startsWith("/privacidad/") ||
    request.nextUrl.pathname.startsWith("/docs/") ||
    // Invitation tokens in the path: /invite/:token
    request.nextUrl.pathname.startsWith("/invite/");

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/registro");

  const isPlatformRoute = request.nextUrl.pathname.startsWith("/platform");

  const isServerAction = request.headers.has("next-action");

  // ── Step 1: No session → redirect to login (unless public route)
  if (!user && !isPublicRoute && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── Authenticated user on auth route → redirect based on role
  if (user && isAuthRoute && !isServerAction) {
    // 6-STEP LOGIN REDIRECT FLOW:
    // Step 2: Check if platform admin
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("doctor_id", user.id)
        .maybeSingle();

      if (profileData && profileData.is_platform_admin === true) {
        // Platform admin → redirect to /platform/panel
        const url = request.nextUrl.clone();
        url.pathname = "/platform/panel";
        return NextResponse.redirect(url);
      }
    } catch {
      // If profile query fails, fall through to default redirect
    }

    // Step 3-5: Look up active membership and redirect by role
    try {
      const { data: memberData } = await supabase
        .from("clinic_members")
        .select("role, is_active")
        .eq("doctor_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!memberData || !memberData.is_active) {
        // No active membership → /sin-plan
        const url = request.nextUrl.clone();
        url.pathname = "/sin-plan";
        return NextResponse.redirect(url);
      }

      // Step 6: Redirect by role
      const role = memberData.role === "admin" ? "owner" : memberData.role;
      const dashboard = ROLE_DASHBOARDS[role] || "/dashboard";
      const url = request.nextUrl.clone();
      url.pathname = dashboard;
      return NextResponse.redirect(url);
    } catch {
      // Fallback: redirect to /dashboard
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ── Platform routes: verify is_platform_admin
  if (user && isPlatformRoute && !isServerAction) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("doctor_id", user.id)
        .maybeSingle();

      if (!profileData || profileData.is_platform_admin !== true) {
        // Not a platform admin → redirect to their dashboard
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

