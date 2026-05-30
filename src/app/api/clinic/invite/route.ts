import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { inviteBodySchema } from "@/lib/api/guards";
import { serverLog } from "@/lib/observability/server-logger";
import Stripe from "stripe";
import { Resend } from "resend";
import { APP_NAME, APP_FROM_EMAIL, APP_URL } from "@/lib/constants/app";

export async function POST(req: Request) {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    // A-13: Validar body con Zod — email, role y clinic_id en una sola pasada
    const rawBody = await req.json();
    const parsed = inviteBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido" },
        { status: 400 },
      );
    }
    const { email, role, clinic_id } = parsed.data;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Check if current user is admin of the clinic
    const { data: memberData } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinic_id)
      .eq("doctor_id", user.id)
      .maybeSingle();

    const { data: profileData } = await supabase
      .from("profiles")
      .select("doctor_id")
      .eq("clinic_id", clinic_id)
      .eq("doctor_id", user.id)
      .maybeSingle();

    const isAdmin = profileData || (memberData && (memberData.role === "owner" || memberData.role === "clinic_admin"));

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Solo los administradores pueden invitar miembros" },
        { status: 403 }
      );
    }

    // ── A-12: Validar seats pagados según plan ─────────────────────────────
    // Obtener el plan del dueño de la clínica (primer perfil creado)
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("plan, stripe_subscription_id")
      .eq("clinic_id", clinic_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const plan = ownerProfile?.plan ?? "basic";

    // Límites de seats por plan.
    // IMPORTANTE: las keys deben coincidir exactamente con los valores de profiles.plan
    // (escrito por el webhook handler desde Stripe price metadata: "basic" | "clinic").
    const PLAN_LIMITS: Record<string, { maxDoctors: number; maxAssistants: number }> = {
      basic:      { maxDoctors: 0,   maxAssistants: 2  }, // sin doctores adicionales
      clinic:     { maxDoctors: 5,   maxAssistants: 10 }, // Fix B-03: era "clinica", debe ser "clinic"
      enterprise: { maxDoctors: 999, maxAssistants: 999 },
    };
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.basic;

    if (role === "doctor") {
      if (limits.maxDoctors === 0) {
        return NextResponse.json(
          { error: `Tu plan ${plan} no permite agregar doctores adicionales. Mejora tu plan.` },
          { status: 403 },
        );
      }
      // Contar doctores actuales en la clínica (excluyendo el dueño que no está en clinic_members)
      const { count: doctorCount } = await supabase
        .from("clinic_members")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinic_id)
        .eq("role", "doctor");

      if ((doctorCount ?? 0) >= limits.maxDoctors) {
        return NextResponse.json(
          { error: `Has alcanzado el límite de ${limits.maxDoctors} doctores de tu plan ${plan}.` },
          { status: 403 },
        );
      }
    }

    if (role === "assistant") {
      const { count: assistantCount } = await supabase
        .from("clinic_members")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinic_id)
        .eq("role", "assistant");

      if ((assistantCount ?? 0) >= limits.maxAssistants) {
        return NextResponse.json(
          { error: `Has alcanzado el límite de ${limits.maxAssistants} asistentes de tu plan ${plan}.` },
          { status: 403 },
        );
      }
    }
    // ── Fin A-12 ────────────────────────────────────────────────────────────

    const adminClient = createAdminClient();

    let invitedUserId: string | undefined;

    // Invite the user or get their ID if they already exist
    // Let's use generateLink instead of inviteUserByEmail to send custom email via Resend
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${serverEnv.NEXT_PUBLIC_SITE_URL}/recuperar/actualizar`,
      }
    });

    if (inviteError) {
      // If user already exists, find their ID via RPC
      const { data: foundId } = await adminClient.rpc('get_user_id_by_email', { email_input: email });
      
      if (foundId) {
        return NextResponse.json({ 
          error: "El usuario ya existe en la plataforma. Para asociarlo a tu clínica, este debe aceptar la invitación desde su panel de control.",
          status: "pending_acceptance"
        }, { status: 409 });
      } else {
        // R-01: No exponer inviteError.message — puede contener detalles internos de Supabase Auth
        log.error("clinic:invite", "generateLink failed", { error: inviteError.message });
        return NextResponse.json({ error: "No se pudo generar la invitación" }, { status: 400 });
      }
    } else {
      invitedUserId = inviteData.user.id;
      
      // Enviar email personalizado con Resend
      const resend = new Resend(serverEnv.RESEND_API_KEY);
      const actionLink = inviteData.properties.action_link;
      const fromAddress = process.env.RESEND_FROM_EMAIL ?? APP_FROM_EMAIL;
      
      // Obtener el nombre de la clínica para el correo
      const { data: clinicData } = await adminClient
        .from("clinics")
        .select("name")
        .eq("id", clinic_id)
        .single();
        
      const clinicName = clinicData?.name || APP_NAME;
      
      const { error: resendError } = await resend.emails.send({
        from: fromAddress,
        to: [email],
        subject: `Has sido invitado a unirte a ${clinicName} en ${APP_NAME}`,
        html: buildInviteEmailHtml({ clinicName, actionLink }),
      });
      
      if (resendError) {
        log.error("clinic:invite", "Error enviando email via Resend", { error: resendError });
        // No fallamos la request porque el usuario ya fue invitado en Auth,
        // pero idealmente deberíamos notificar o reintentar
      }
    }

    // Metered Billing: Actualizar cantidad en Stripe si es un doctor
    let doctorCount = 0;
    if (role === "doctor" && plan === "clinic" && ownerProfile?.stripe_subscription_id) {
      const { count } = await supabase
        .from("clinic_members")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinic_id)
        .eq("role", "doctor");
      doctorCount = count ?? 0;

      const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
      try {
        const subscription = await stripe.subscriptions.retrieve(ownerProfile.stripe_subscription_id);
        const itemId = subscription.items.data[0]?.id;
        if (itemId) {
          // Total quantity = existing members + new member (1) + owner (1)
          const newQuantity = doctorCount + 2; 
          await stripe.subscriptionItems.update(itemId, { quantity: newQuantity });
        }
      } catch (stripeErr) {
        log.error("clinic:invite", "Fallo al actualizar cantidad en Stripe", { error: stripeErr });
        return NextResponse.json({ error: "Fallo al actualizar la suscripción en Stripe." }, { status: 500 });
      }
    }

    // Add to clinic_members
    const { error: insertError } = await adminClient
      .from("clinic_members")
      .insert({
        clinic_id,
        doctor_id: invitedUserId,
        role,
        invited_by: user.id,
      });

    if (insertError) {
      if (insertError.code === "23505") { // unique violation
        return NextResponse.json({ error: "El usuario ya es miembro de esta clínica" }, { status: 400 });
      }
      throw insertError;
    }

    // Optional: Send a custom email via Resend
    // We already sent the Supabase invite email, but if they existed, we might need to notify them.
    
    return NextResponse.json({ success: true, user_id: invitedUserId });
  } catch (err) {
    log.error("clinic:invite", "Unhandled error", { error: err });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

function buildInviteEmailHtml({ clinicName, actionLink }: { clinicName: string; actionLink: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f6f8f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #d8e0dd;overflow:hidden;">
          <tr>
            <td style="background:#0f766e;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${APP_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#15212b;">
                Hola 👋
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#51606d;line-height:1.7;">
                Has sido invitado a formar parte del equipo de <strong>${clinicName}</strong> en nuestra plataforma.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background:#0f766e;border-radius:10px;">
                    <a href="${actionLink}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.2px;">
                      Aceptar Invitación →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:#51606d;line-height:1.7;">
                Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br/>
                <a href="${actionLink}" style="color:#0f766e;word-break:break-all;">${actionLink}</a>
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
