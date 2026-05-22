import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { inviteBodySchema } from "@/lib/api/guards";

export async function POST(req: Request) {
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

    const isAdmin = profileData || (memberData && memberData.role === "admin");

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
      .select("plan")
      .eq("clinic_id", clinic_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const plan = ownerProfile?.plan ?? "basic";

    // Límites de seats por plan
    const PLAN_LIMITS: Record<string, { maxDoctors: number; maxAssistants: number }> = {
      basic:      { maxDoctors: 0,   maxAssistants: 2  }, // sin doctores adicionales
      clinica:    { maxDoctors: 5,   maxAssistants: 10 },
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

    // Invite the user or get their ID if they already exist
    let invitedUserId;

    // Let's use inviteUserByEmail
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${serverEnv.NEXT_PUBLIC_SITE_URL}/login`,
    });

    if (inviteError) {
      // If user already exists, find their ID via RPC
      const { data: foundId } = await adminClient.rpc('get_user_id_by_email', { email_input: email });
      
      if (foundId) {
        invitedUserId = foundId as string;
      } else {
        return NextResponse.json({ error: inviteError.message }, { status: 400 });
      }
    } else {
      invitedUserId = inviteData.user.id;
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
