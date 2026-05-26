import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

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

  let configFixed = false;
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://glyphmed.app";
    const pushSecret = serverEnv.PUSH_SEND_SECRET || "secret_for_system_push";
    
    const { error: configError } = await admin.from("app_config").upsert([
      { key: "site_url", value: siteUrl },
      { key: "push_send_secret", value: pushSecret }
    ]);
    if (!configError) {
      configFixed = true;
    }
  } catch (err) {
    console.error("Error auto-fixing config", err);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    user_id: user.id,
    config_fixed: configFixed,
    subscription_count: subs?.length || 0,
    subscriptions: subs?.map(s => ({
      id: s.id,
      endpoint_prefix: s.endpoint.substring(0, 50) + "...",
      created_at: s.created_at,
    }))
  });
}
