import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import { APP_NAME, APP_FROM_EMAIL, APP_URL } from "@/lib/constants/app";
import { isSecretValid, emailFollowupBodySchema } from "@/lib/api/guards";
import { serverEnv } from "@/lib/env";

/**
 * POST /api/email/followup
 *
 * Cron-triggered endpoint: sends follow-up reminder emails to all doctors
 * with pending follow_up_tasks due today.
 *
 * Auth: requires x-email-secret header matching RESEND_EMAIL_SECRET env var.
 *
 * Body: { target_doctor_id: string } — optional, sends only to that doctor.
 * If omitted (cron mode), the SQL function iterates and calls per-doctor.
 *
 * Response:
 *   { success: true, sent: number } on success
 *   { error: string } on failure
 */
export async function POST(req: Request) {
  const incomingSecret = req.headers.get("x-email-secret");

  // HAL-08: Comparación de secretos en tiempo constante
  // HAL-10: RESEND_EMAIL_SECRET desde serverEnv (falla en startup si no está configurado)
  if (!isSecretValid(incomingSecret, serverEnv.RESEND_EMAIL_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resend = new Resend(serverEnv.RESEND_API_KEY);

  // HAL-03: Validar body con Zod en lugar de cast manual
  const rawBody = await req.json();
  const parsed = emailFollowupBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload inválido" },
      { status: 400 },
    );
  }
  const { target_doctor_id, doctor_email, doctor_name, due_count = 1 } = parsed.data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? APP_URL;
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? APP_FROM_EMAIL;
  const name = doctor_name ?? "Doctor";

  // R-07: Usar createAdminClient() centralizado (server.ts) en lugar de
  // instanciar inline con process.env!. Elimina non-null assertions.
  const admin = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const { count } = await admin
    .from("follow_up_tasks")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", target_doctor_id)
    .eq("due_date", today)
    .eq("status", "pending");

  const taskCount = count ?? due_count;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [doctor_email],
    subject: `🩺 ${taskCount} seguimiento${taskCount !== 1 ? "s" : ""} pendiente${taskCount !== 1 ? "s" : ""} hoy — ${APP_NAME}`,
    html: buildEmailHtml({ name, taskCount, siteUrl }),
  });

  if (error) {
    console.error("[email/followup] Resend error:", error);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sent: 1, taskCount });
}

// ─── Email Template ────────────────────────────────────────────────────────────

function buildEmailHtml({
  name,
  taskCount,
  siteUrl,
}: {
  name: string;
  taskCount: number;
  siteUrl: string;
}): string {
  const taskLabel = taskCount === 1
    ? "1 paciente requiere seguimiento"
    : `${taskCount} pacientes requieren seguimiento`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seguimientos pendientes — ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f6f8f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #d8e0dd;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0f766e;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${APP_NAME}</p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:0.1em;text-transform:uppercase;">Motor Clínico</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#15212b;">
                Hola, ${escapeHtml(name)} 👋
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#51606d;line-height:1.7;">
                Tienes <strong style="color:#0f766e;">${taskLabel}</strong> programado${taskCount !== 1 ? "s" : ""} para hoy.
              </p>

              <!-- Task count pill -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#f0fdf8;border:1px solid #a7f3d0;border-radius:12px;padding:20px 28px;text-align:center;">
                    <p style="margin:0;font-size:42px;font-weight:800;color:#0f766e;line-height:1;">${taskCount}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#059669;font-weight:600;">
                      seguimiento${taskCount !== 1 ? "s" : ""} para hoy
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#51606d;line-height:1.7;">
                Accede a ${APP_NAME} para revisar los detalles de cada paciente y registrar el resultado del seguimiento.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0f766e;border-radius:10px;">
                    <a href="${siteUrl}/dashboard"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.2px;">
                      Ver mis seguimientos →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #d8e0dd;background:#f6f8f6;">
              <p style="margin:0;font-size:12px;color:#9eb0bb;line-height:1.6;">
                Este email fue enviado automáticamente por ${APP_NAME} porque tienes seguimientos clínicos programados para hoy.
                Si no deseas recibir estos recordatorios, puedes desactivarlos en
                <a href="${siteUrl}/ajustes" style="color:#0f766e;">Ajustes → Notificaciones</a>.
              </p>
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
