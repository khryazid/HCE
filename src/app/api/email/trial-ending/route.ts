import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  const incomingSecret = req.headers.get("x-email-secret");
  const expectedSecret = process.env.RESEND_EMAIL_SECRET;

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[email/trial-ending] RESEND_API_KEY not configured");
    return NextResponse.json({ error: "Email no configurado" }, { status: 503 });
  }

  const body = await req.json() as {
    target_doctor_id?: string;
    doctor_email?: string;
    doctor_name?: string;
    days_left?: number;
  };

  const { target_doctor_id, doctor_email, doctor_name, days_left = 0 } = body;

  if (!target_doctor_id || !doctor_email) {
    return NextResponse.json({ error: "target_doctor_id y doctor_email son requeridos" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.glyphmedico.com";
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Glyph <recordatorios@glyphmedico.com>";
  const name = doctor_name ?? "Doctor";

  const resend = new Resend(resendKey);

  const subject = days_left === 0 
    ? "🚨 Tu prueba gratuita de Glyph finaliza hoy" 
    : `⏳ Tu prueba gratuita de Glyph finaliza en ${days_left} día${days_left !== 1 ? "s" : ""}`;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [doctor_email],
    subject,
    html: buildEmailHtml({ name, daysLeft: days_left, siteUrl }),
  });

  if (error) {
    console.error("[email/trial-ending] Resend error:", error);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sent: 1 });
}

// ─── Email Template ────────────────────────────────────────────────────────────

function buildEmailHtml({
  name,
  daysLeft,
  siteUrl,
}: {
  name: string;
  daysLeft: number;
  siteUrl: string;
}): string {
  const statusLabel = daysLeft === 0
    ? "finaliza hoy"
    : `finaliza en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu prueba gratuita finaliza pronto — Glyph</title>
</head>
<body style="margin:0;padding:0;background:#f6f8f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #d8e0dd;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0f766e;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Glyph</p>
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
                Tu prueba gratuita de Glyph <strong style="color:#c2410c;">${statusLabel}</strong>.
              </p>

              <!-- Days left pill -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 28px;text-align:center;">
                    <p style="margin:0;font-size:42px;font-weight:800;color:#c2410c;line-height:1;">${daysLeft}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#ea580c;font-weight:600;">
                      día${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#51606d;line-height:1.7;">
                Para mantener el acceso ininterrumpido a todas tus historias clínicas, citas programadas y documentos generados, activa tu suscripción ahora.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0f766e;border-radius:10px;">
                    <a href="${siteUrl}/billing"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.2px;">
                      Activar suscripción →
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
                Si decides no continuar, tus datos permanecerán seguros y podrás reactivar tu cuenta en cualquier momento.
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
