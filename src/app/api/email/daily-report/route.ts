import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import { APP_NAME, APP_FROM_EMAIL, APP_URL } from "@/lib/constants/app";
import { isSecretValid } from "@/lib/api/guards";
import { serverEnv } from "@/lib/env";
import { serverLog } from "@/lib/observability/server-logger";
import { z } from "zod";

const dailyReportBodySchema = z.object({
  target_doctor_id: z.string().uuid(),
  doctor_email: z.string().email(),
  doctor_name: z.string().optional(),
});

/**
 * POST /api/email/daily-report
 *
 * Envía un resumen diario de facturación y pacientes atendidos al médico.
 */
export async function POST(req: Request) {
  const incomingSecret = req.headers.get("x-email-secret");

  if (!isSecretValid(incomingSecret, serverEnv.RESEND_EMAIL_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resend = new Resend(serverEnv.RESEND_API_KEY);
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = dailyReportBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload inválido" },
      { status: 400 },
    );
  }

  const { target_doctor_id, doctor_email, doctor_name } = parsed.data;
  const name = doctor_name ?? "Doctor";
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? APP_FROM_EMAIL;
  const admin = createAdminClient();

  // Fecha en la zona horaria UTC pero ajustada al día. Lo ideal es tomar el inicio y fin del día actual.
  // Como simplificación tomamos la fecha actual en YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  const { data: appointments, error: fetchError } = await admin
    .from("appointments")
    .select("status, payment_status, amount, payment_method")
    .eq("doctor_id", target_doctor_id)
    .gte("start_time", `${today}T00:00:00Z`)
    .lt("start_time", `${today}T23:59:59Z`);

  if (fetchError) {
    log.error("email:daily-report", "Error fetching appointments", { error: fetchError });
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 });
  }

  const validAppointments = appointments?.filter(a => a.status === 'completed' || a.status === 'scheduled') || [];
  const totalPatients = validAppointments.length;
  
  let totalBilled = 0;
  let totalCollected = 0;
  const methodsCount: Record<string, number> = {};

  validAppointments.forEach(a => {
    const amount = a.amount || 0;
    totalBilled += amount;
    
    if (a.payment_status === 'paid') {
      totalCollected += amount;
      if (a.payment_method) {
        methodsCount[a.payment_method] = (methodsCount[a.payment_method] || 0) + amount;
      }
    }
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [doctor_email],
    subject: `📊 Cierre Diario: ${totalPatients} pacientes — ${APP_NAME}`,
    html: buildEmailHtml({ name, totalPatients, totalBilled, totalCollected, methodsCount, siteUrl }),
  });

  if (error) {
    log.error("email:daily-report", "Resend error", { error });
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sent: 1 });
}

function buildEmailHtml({
  name,
  totalPatients,
  totalBilled,
  totalCollected,
  methodsCount,
  siteUrl,
}: {
  name: string;
  totalPatients: number;
  totalBilled: number;
  totalCollected: number;
  methodsCount: Record<string, number>;
  siteUrl: string;
}): string {
  const methodsHtml = Object.entries(methodsCount).map(([method, amount]) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;color:#51606d;">${escapeHtml(method)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#0f766e;font-weight:600;">$${amount.toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cierre Diario — ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f6f8f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #d8e0dd;overflow:hidden;">
          <tr>
            <td style="background:#0f766e;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${APP_NAME}</p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:0.1em;text-transform:uppercase;">Cierre Diario de Agenda</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#15212b;">Hola, ${escapeHtml(name)} 👋</p>
              <p style="margin:0 0 28px;font-size:15px;color:#51606d;line-height:1.7;">
                Aquí tienes el resumen de tu jornada de hoy.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td width="50%" style="padding-right:10px;">
                    <div style="background:#f0fdf8;border:1px solid #a7f3d0;border-radius:12px;padding:20px;text-align:center;">
                      <p style="margin:0;font-size:32px;font-weight:800;color:#0f766e;line-height:1;">${totalPatients}</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#059669;font-weight:600;">Pacientes Atendidos</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:10px;">
                    <div style="background:#f0fdf8;border:1px solid #a7f3d0;border-radius:12px;padding:20px;text-align:center;">
                      <p style="margin:0;font-size:32px;font-weight:800;color:#0f766e;line-height:1;">$${totalCollected.toFixed(2)}</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#059669;font-weight:600;">Total Cobrado</p>
                    </div>
                  </td>
                </tr>
              </table>

              <h4 style="margin:0 0 16px;font-size:14px;color:#15212b;text-transform:uppercase;letter-spacing:1px;">Desglose de Ingresos (Cobrados)</h4>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;font-size:14px;">
                ${methodsHtml || '<tr><td style="padding:8px 0;color:#51606d;">No se registraron cobros hoy.</td></tr>'}
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#51606d;line-height:1.7;">
                Monto total facturado (incluyendo pagos pendientes): <strong style="color:#15212b;">$${totalBilled.toFixed(2)}</strong>
              </p>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0f766e;border-radius:10px;">
                    <a href="${siteUrl}/dashboard" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.2px;">Ir al Dashboard →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
