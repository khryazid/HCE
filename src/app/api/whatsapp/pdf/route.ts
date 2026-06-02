import { NextResponse } from "next/server";
import { whatsappClient } from "@/lib/whatsapp/client";
import { serverLog } from "@/lib/observability/server-logger";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";

const pdfSchema = z.object({
  phone: z.string().min(8),
  patientName: z.string(),
  pdfUrl: z.string().url(),
  filename: z.string()
});

export type ApiResponse<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string };

export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    const rawBody = await req.json();
    const parsed = pdfSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Payload inválido: " + parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { phone, patientName, pdfUrl, filename } = parsed.data;

    // Rate Limiting: Prevenir abuso de la API de WhatsApp verificando la sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn("whatsapp:pdf", "Acceso denegado: falta de sesión válida");
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const doctorId = user.id; 
    const admin = createAdminClient();
    const { data: canSend, error: rateLimitError } = await admin.rpc("claim_api_rate_limit", {
      p_identifier: doctorId,
      p_scope: "whatsapp_send",
      p_max_requests: 10,
      p_window_seconds: 3600
    });
    if (rateLimitError || !canSend) {
       log.warn("whatsapp:pdf", "Rate limit exceeded", { doctorId });
       return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const success = await whatsappClient.sendPdfDocument(phone, pdfUrl, patientName, filename);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "No se pudo enviar el PDF vía WhatsApp." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    log.error("whatsapp:pdf", "Unhandled error", { error: err });
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
