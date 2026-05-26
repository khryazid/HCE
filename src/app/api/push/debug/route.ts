import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("doctor_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    user_id: user.id,
    subscription_count: subs?.length || 0,
    subscriptions: subs?.map(s => ({
      id: s.id,
      endpoint_prefix: s.endpoint.substring(0, 50) + "...",
      created_at: s.created_at,
    }))
  });
}
