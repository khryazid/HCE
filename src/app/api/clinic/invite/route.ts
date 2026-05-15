import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { email, role, clinic_id } = await req.json();

    if (!email || !role || !clinic_id) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

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

    // Check Plan Limits
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("clinic_id", clinic_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
      
    const plan = ownerProfile?.plan || "basic";

    if (plan === "basic") {
      if (role === "doctor") {
        return NextResponse.json(
          { error: "Tu plan Básico no permite agregar otros doctores. Mejora al Plan Clínica." },
          { status: 403 }
        );
      }
      if (role === "assistant") {
        const { count } = await supabase
          .from("clinic_members")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinic_id)
          .eq("role", "assistant");
          
        if ((count || 0) >= 2) {
          return NextResponse.json(
            { error: "Has alcanzado el límite de 2 asistentes de tu Plan Básico." },
            { status: 403 }
          );
        }
      }
    }

    const adminClient = createAdminClient();

    // Invite the user or get their ID if they already exist
    let invitedUserId;

    // Let's use inviteUserByEmail
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${serverEnv.NEXT_PUBLIC_SITE_URL}/login`,
    });

    if (inviteError) {
      // If user already exists, find their ID via RPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: foundId } = await (adminClient.rpc as any)('get_user_id_by_email', { email_input: email });
      
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
