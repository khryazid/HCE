import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { inviteBodySchema } from "@/lib/api/guards";
import { serverLog } from "@/lib/observability/server-logger";
import Stripe from "stripe";
import { Resend } from "resend";
import { APP_NAME, APP_FROM_EMAIL, APP_URL, CURRENT_TERMS_VERSION } from "@/lib/constants/app";

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
    const { email, role, clinic_id, password } = parsed.data;

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
    let actionLinkForEmail = `${serverEnv.NEXT_PUBLIC_SITE_URL}/login`;

    if (password) {
      // 1. Crear usuario directamente con clave
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        // Podría fallar si ya existe
        const { data: foundId } = await adminClient.rpc('get_user_id_by_email', { email_input: email });
        if (foundId) {
          invitedUserId = foundId;
          // Al ya existir, no le sobreescribimos la clave, simplemente le enviamos al login
        } else {
          log.error("clinic:invite", "createUser failed", { error: createError.message });
          return NextResponse.json({ error: "No se pudo crear el usuario con la contraseña indicada" }, { status: 400 });
        }
      } else {
        invitedUserId = createData.user.id;
      }
    } else {
      // 2. Flujo de invitación tradicional (magic link)
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
          // El usuario ya existe. Generamos magic link.
          const { data: magicData, error: magicError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: {
              redirectTo: `${serverEnv.NEXT_PUBLIC_SITE_URL}/recuperar/actualizar`,
            }
          });

          if (magicError) {
            log.error("clinic:invite", "generateLink magiclink failed", { error: magicError.message });
            return NextResponse.json({ error: "No se pudo generar el acceso para el usuario existente" }, { status: 400 });
          }
          
          invitedUserId = foundId;
          actionLinkForEmail = magicData.properties.action_link;
        } else {
          log.error("clinic:invite", "generateLink failed", { error: inviteError.message });
          return NextResponse.json({ error: "No se pudo generar la invitación" }, { status: 400 });
        }
      } else {
        invitedUserId = inviteData.user.id;
        actionLinkForEmail = inviteData.properties.action_link;
      }
    }

    // Enviar email personalizado con Resend
    const resend = new Resend(serverEnv.RESEND_API_KEY);
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
        subject: password ? `Has sido invitado a unirte a ${clinicName} en ${APP_NAME}` : `Invitación a unirte a ${clinicName} en ${APP_NAME}`,
        html: buildInviteEmailHtml({ clinicName, actionLink: actionLinkForEmail, password }),
      });
      
      if (resendError) {
        log.error("clinic:invite", "Error enviando email via Resend", { error: resendError });
        // No fallamos la request porque el usuario ya fue invitado en Auth,
        // pero idealmente deberíamos notificar o reintentar
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

    // A-14: Crear un perfil básico para el usuario invitado si no tiene uno.
    // Esto evita que los asistentes tengan que pasar por el flujo de onboarding y crear una clínica nueva.
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("doctor_id")
      .eq("doctor_id", invitedUserId)
      .maybeSingle();

    if (!existingProfile) {
      await adminClient.from("profiles").insert({
        doctor_id: invitedUserId,
        clinic_id: clinic_id,
        full_name: email.split("@")[0], // Nombre por defecto basado en el correo
        specialty: [],
        plan: ownerProfile?.plan ?? "basic",
        subscription_status: "active", // Los invitados no pagan
        onboarding_state: { step: 4, completed: true }, // Marcar onboarding como completado
        terms_version: CURRENT_TERMS_VERSION,
      });
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

function buildInviteEmailHtml({ clinicName, actionLink, password }: { clinicName: string; actionLink: string; password?: string }): string {
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
                  <p style="margin:0 0 24px 0;font-size:16px;line-height:24px;color:#4b5563;">
                    Has sido invitado a unirte al equipo de <strong>${clinicName}</strong> como miembro del personal clínico.
                  </p>
                  ${password ? `
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#166534;font-weight:600;">Tus credenciales de acceso temporal:</p>
                    <p style="margin:0;font-size:16px;color:#15803d;"><strong>Contraseña:</strong> ${password}</p>
                    <p style="margin:8px 0 0 0;font-size:13px;color:#166534;">Ingresa con esta contraseña y tu correo electrónico. Podrás cambiarla luego en tus ajustes.</p>
                  </div>
                  ` : ''}
                  <div style="text-align:center;margin-bottom:32px;">
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
