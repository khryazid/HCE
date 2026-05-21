import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=<query>
 *
 * Full-text search via search_global() Postgres RPC (FTS con websearch_to_tsquery).
 *
 * A-01: La función SQL usa websearch_to_tsquery + índices GIN — sin ILIKE con wildcard.
 * A-06: La función SQL deriva clinic_id desde auth.uid() internamente.
 *       Este endpoint ya NO pasa p_clinic_id → elimina el vector IDOR.
 *
 * Responde con hasta 40 resultados (20 pacientes + 20 consultas) ordenados por ts_rank.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  // Minimum 2 chars to avoid meaningless queries
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore in API routes — cookies are read-only in some Next.js contexts
          }
        },
      },
    },
  );

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // A-06: NO pasamos p_clinic_id — la función SQL lo deriva desde auth.uid().
  // Esto elimina el vector IDOR donde un cliente podría pasar un clinic_id ajeno.
  const { data, error } = await supabase.rpc("search_global", {
    p_query: q,
  });

  if (error) {
    console.error("[search] RPC error:", error.message);
    // Return empty results instead of exposing the error details to the client
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: data ?? [] });
}
