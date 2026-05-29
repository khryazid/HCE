import { NextResponse } from "next/server";
import { whatsappClient } from "@/lib/whatsapp/client";
import { serverLog } from "@/lib/observability/server-logger";
import { z } from "zod";

const reminderSchema = z.object({
  phone: z.string().min(8),
  patientName: z.string(),
  dateStr: z.string()
});

export async function POST(req: Request) {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    const rawBody = await req.json();
    const parsed = reminderSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido" },
        { status: 400 }
      );
    }

    const { phone, patientName, dateStr } = parsed.data;

    const success = await whatsappClient.sendTextReminder(phone, patientName, dateStr);

    if (!success) {
      return NextResponse.json(
        { error: "No se pudo enviar el recordatorio vía WhatsApp." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("whatsapp:reminder", "Unhandled error", { error: err });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
