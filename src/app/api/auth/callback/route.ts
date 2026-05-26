import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Si la recuperación o login por link fue exitoso, redirigimos
      return NextResponse.redirect(new URL(next, request.url));
    }
    
    // Si hubo error al intercambiar (ej. link expirado)
    const errorUrl = new URL("/login", request.url);
    errorUrl.searchParams.set("error", "El enlace ha expirado o es inválido. Por favor, solicita uno nuevo.");
    return NextResponse.redirect(errorUrl);
  }

  // Si no hay código, redirigimos al login
  return NextResponse.redirect(new URL("/login", request.url));
}
