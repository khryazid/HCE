import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase.types";

type PushSubscriptionInsert =
  Database["public"]["Tables"]["push_subscriptions"]["Insert"];

type ProfileClinicRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "clinic_id">;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys, clinic_id } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("doctor_id", user.id)
      .maybeSingle();

    const profile = profileData as ProfileClinicRow | null;

    if (profileError || !profile?.clinic_id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });
    }

    if (clinic_id && clinic_id !== profile.clinic_id) {
      return NextResponse.json({ error: "clinic_id no autorizado" }, { status: 403 });
    }

    // NOTE: `as any` below is intentional. The Supabase type generator emits
    // `never` for Insert/Upsert on tables with PostgrestVersion "12" and empty
    // Relationships[]. This is a known bug in @supabase/supabase-js type output.
    // The cast is safe: the object shape is validated by PushSubscriptionInsert above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("push_subscriptions") as any)
      .upsert(
        {
          doctor_id: user.id,
          clinic_id: profile.clinic_id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        } satisfies PushSubscriptionInsert,
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Error saving push subscription:", error);
      return NextResponse.json({ error: "Error interno al guardar la suscripcion" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe Error:", err);
    return NextResponse.json({ error: "Error desconocido" }, { status: 500 });
  }
}
