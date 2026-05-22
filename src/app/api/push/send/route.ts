import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";
import type { Database } from "@/types/supabase.types";
import { serverEnv } from "@/lib/env";
import { pushSendBodySchema, isSecretValid } from "@/lib/api/guards";
import { APP_NAME } from "@/lib/constants/app";

type PushSubscriptionRow =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];

/** web-push throws objects with a statusCode property on delivery failure. */
type WebPushError = { statusCode?: number };

function isWebPushError(err: unknown): err is WebPushError {
  return typeof err === "object" && err !== null && "statusCode" in err;
}

// Rate limit: 10 push requests per user per minute (abuse protection)
const PUSH_RATE_LIMIT = 10;
const PUSH_RATE_WINDOW = 60;

export async function POST(req: Request) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) throw new Error("Missing env var: NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    webpush.setVapidDetails(
      serverEnv.VAPID_MAILTO,
      vapidPublicKey,
      serverEnv.VAPID_PRIVATE_KEY,
    );

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Auth: Accept EITHER a logged-in user OR a trusted system secret header.
    const incomingSecret = req.headers.get("x-push-secret");
    // HAL-08: Comparación de secretos en tiempo constante
    const isSystemRequest = isSecretValid(incomingSecret, serverEnv.PUSH_SEND_SECRET);

    if (!user && !isSystemRequest) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Rate limit per user (skip for cron/system requests — they're already authenticated by secret)
    if (user && !isSystemRequest) {
      const { data: allowed, error: rateLimitError } = await supabase.rpc("claim_api_rate_limit", {
        p_scope: "push-send",
        p_identifier: user.id,
        p_window_seconds: PUSH_RATE_WINDOW,
        p_max_requests: PUSH_RATE_LIMIT,
      });
      if (rateLimitError || !allowed) {
        return NextResponse.json(
          { error: "Demasiadas solicitudes. Intenta en un momento." },
          { status: 429 },
        );
      }
    }

    // A-13: Validar body con Zod
    const rawBody = await req.json();
    const parsedBody = pushSendBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Payload inválido" },
        { status: 400 },
      );
    }
    const { title, body: message, target_doctor_id, url } = parsedBody.data;

    if (target_doctor_id && user && target_doctor_id !== user.id && !isSystemRequest) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // System requests must provide target_doctor_id; user sessions default to self.
    const targetDoctorId = target_doctor_id ?? (user?.id ?? "");
    if (!targetDoctorId) {
      return NextResponse.json({ error: "target_doctor_id requerido para requests de sistema" }, { status: 400 });
    }

    // Fetch subscriptions for the target user
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("doctor_id", targetDoctorId);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ error: "No hay dispositivos suscritos" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: title || `Notificación ${APP_NAME}`,
      body: message || "Tienes una nueva actualización",
      url: url || "/dashboard",
    });

    // Send push to all devices
    const promises = subs.map(async (sub: PushSubscriptionRow) => {
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
      } catch (e: unknown) {
        if (isWebPushError(e) && (e.statusCode === 410 || e.statusCode === 404)) {
          // Subscription expired or is invalid — remove from DB
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
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
