import { NextResponse } from "next/server";
import { whatsappClient } from "@/lib/whatsapp/client";
import { serverLog } from "@/lib/observability/server-logger";
import { z } from "zod";

const pdfSchema = z.object({
  phone: z.string().min(8),
  patientName: z.string(),
  pdfUrl: z.string().url(),
  filename: z.string()
});

export async function POST(req: Request) {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    const rawBody = await req.json();
    const parsed = pdfSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido" },
        { status: 400 }
      );
    }

    const { phone, patientName, pdfUrl, filename } = parsed.data;

    const success = await whatsappClient.sendPdfDocument(phone, pdfUrl, patientName, filename);

    if (!success) {
      return NextResponse.json(
        { error: "No se pudo enviar el PDF vía WhatsApp." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("whatsapp:pdf", "Unhandled error", { error: err });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
