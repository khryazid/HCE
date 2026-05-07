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

    const { error } = await supabase
      .from("push_subscriptions")
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

/** DELETE /api/push/subscribe — Remove a push subscription from the DB. */
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint requerido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("doctor_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      return NextResponse.json({ error: "Error al eliminar suscripcion" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unsubscribe Error:", err);
    return NextResponse.json({ error: "Error desconocido" }, { status: 500 });
  }
}
