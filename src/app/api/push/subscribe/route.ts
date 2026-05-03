import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys, clinic_id } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth || !clinic_id) {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    // Upsert the subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("push_subscriptions") as any)
      .upsert(
        {
          doctor_id: user.id,
          clinic_id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
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
