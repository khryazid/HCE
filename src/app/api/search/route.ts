import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=<query>
 *
 * Full-text search via search_global() Postgres RPC (FTS con websearch_to_tsquery).
 *
 * A-01: La función SQL usa websearch_to_tsquery + índices GIN — sin ILIKE con wildcard.
 * A-06: La función SQL deriva clinic_id desde auth.uid() internamente.
 *       Este endpoint ya NO pasa p_clinic_id → elimina el vector IDOR.
 * R-06: Usa createClient() centralizado (server.ts) — elimina non-null assertions inline.
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

  const supabase = await createClient();

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // A-06: NO pasamos p_clinic_id — la función SQL lo deriva desde auth.uid().
  // Esto elimina el vector IDOR donde un cliente podría pasar un clinic_id ajeno.
  // Nota: los tipos generados tienen la firma antigua con p_clinic_id.
  // Actualizar con `npm run db:types` para eliminar este cast.
  const { data, error } = await supabase.rpc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "search_global" as any,
    { p_query: q }
  );

  if (error) {
    console.error("[search] RPC error:", error.message);
    // Return empty results instead of exposing the error details to the client
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: data ?? [] });
}
