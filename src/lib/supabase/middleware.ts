import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/registro");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/pacientes") ||
    request.nextUrl.pathname.startsWith("/consultas") ||
    request.nextUrl.pathname.startsWith("/tratamientos") ||
    request.nextUrl.pathname.startsWith("/ajustes");

  if (!user && isProtectedRoute) {
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
