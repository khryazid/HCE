import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=<query>
 *
 * Full-text search using the search_global() Postgres RPC.
 * Returns up to 40 results (20 patients + 20 consultations) ranked by ts_rank.
 *
 * Falls back to an empty array on:
 *   - Missing query (returns [])
 *   - Short query < 2 chars (returns [])
 *   - RPC error (returns [] with error logged)
 *
 * Rate limiting: inherits Supabase RLS — the RPC runs as SECURITY INVOKER
 * so the caller can only see rows their own clinic_id allows.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

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
            // Ignore in API routes
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get the caller's clinic_id from their profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("doctor_id", user.id)
    .single();

  if (!profile?.clinic_id) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase.rpc("search_global", {
    p_query: q,
    p_clinic_id: profile.clinic_id,
  });

  if (error) {
    console.error("[search_global] RPC error:", error.message);
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: data ?? [] });
}
