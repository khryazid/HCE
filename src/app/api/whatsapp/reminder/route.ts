import { NextResponse } from "next/server";
import { whatsappClient } from "@/lib/whatsapp/client";
import { serverLog } from "@/lib/observability/server-logger";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ApiResponse } from "../pdf/route";

const reminderSchema = z.object({
  phone: z.string().min(8),
  patientName: z.string(),
  dateStr: z.string()
});

export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    const rawBody = await req.json();
    const parsed = reminderSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Payload inválido" },
        { status: 400 }
      );
    }

    const { phone, patientName, dateStr } = parsed.data;

    // Rate Limiting de recordatorios verificando la sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn("whatsapp:reminder", "Acceso denegado: falta de sesión válida");
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const doctorId = user.id;
    const admin = createAdminClient();
    const { data: canSend } = await admin.rpc("claim_api_rate_limit", {
      p_identifier: doctorId,
      p_scope: "whatsapp_reminder",
      p_max_requests: 10,
      p_window_seconds: 3600
    });
    
    if (!canSend) {
       log.warn("whatsapp:reminder", "Rate limit exceeded", { doctorId });
       return NextResponse.json(
         { success: false, error: "Límite de envíos excedido para recordatorios." }, 
         { status: 429 }
       );
    }

    const success = await whatsappClient.sendTextReminder(phone, patientName, dateStr);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "No se pudo enviar el recordatorio vía WhatsApp." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    log.error("whatsapp:reminder", "Unhandled error", { error: err });
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
