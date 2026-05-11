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

    const adminClient = createAdminClient();

    // Invite the user or get their ID if they already exist
    let invitedUserId;

    // Let's use inviteUserByEmail
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${serverEnv.NEXT_PUBLIC_SITE_URL}/login`,
    });

    if (inviteError) {
      // If user already exists, Supabase admin auth might return an error or we might need to find them.
      // Wait, admin.inviteUserByEmail will return the user object if they exist but aren't confirmed, or fail.
      // Actually, let's just list users to find them.
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existing = listData.users.find((u: { email?: string }) => u.email === email);
      
      if (existing) {
        invitedUserId = existing.id;
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
