import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// Configuration
webpush.setVapidDetails(
  "mailto:soporte@tu-dominio.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify it's authorized (In reality, this endpoint could be triggered by Supabase Webhooks or a Cron Job,
    // so you'd want a secure secret header check. For now, we ensure a valid user is logged in).
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { title, body: message, target_doctor_id, url } = body;

    // Fetch subscriptions for the target user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs, error } = await (supabase.from("push_subscriptions") as any)
      .select("*")
      .eq("doctor_id", target_doctor_id || user.id);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ error: "No hay dispositivos suscritos" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: title || "Notificación HCE",
      body: message || "Tienes una nueva actualización",
      url: url || "/dashboard",
    });

    // Send push to all devices
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promises = subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          },
          payload
        );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Subscription expired or is invalid, delete it from DB
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("push_subscriptions") as any).delete().eq("id", (sub as any).id);
        } else {
          console.error("Push send error:", e);
        }
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, count: subs.length });
  } catch (err) {
    console.error("Send Push Error:", err);
    return NextResponse.json({ error: "Error desconocido" }, { status: 500 });
  }
}
