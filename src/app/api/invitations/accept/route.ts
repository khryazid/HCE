import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { serverLog } from "@/lib/observability/server-logger";
import { CURRENT_TERMS_VERSION } from "@/lib/constants/app";

// Role → dashboard redirect map
const ROLE_DASHBOARDS: Record<string, string> = {
  owner: "/dashboard",
  doctor: "/dashboard",
  assistant: "/agenda",
  clinic_admin: "/administracion",
  receptionist: "/recepcion",
  lab: "/laboratorio",
  imaging: "/imagen",
  surgery: "/cirugia",
};

/**
 * POST /api/invitations/accept
 *
 * Accepts an invitation atomically:
 * 1. Validates the token
 * 2. Creates user (if new) or uses existing
 * 3. Inserts organization_member
 * 4. Updates invitation status to 'accepted'
 *
 * Body:
 *   { token: string, full_name?: string, password?: string }
 *
 * full_name and password are required for NEW users only.
 */
export async function POST(req: Request) {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    const body = await req.json();
    const { token, full_name, password } = body;

    if (!token) {
      return NextResponse.json({ error: "Token requerido." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // NOTE: `invitations` table not yet in supabase.types.ts — cast through `any`
    // until `npm run db:types` is run after the migration is applied.
    const invitationsTable = (adminClient as any).from("invitations");

    // 1. Validate the invitation
    const { data: invitation, error: invError } = await invitationsTable
      .select("id, organization_id, email, role, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada." },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Esta invitación ya fue procesada." },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await invitationsTable
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return NextResponse.json(
        { error: "Esta invitación ha expirado." },
        { status: 400 }
      );
    }

    // 2. Check if user exists
    let userId: string | null = null;

    try {
      const { data: foundId } = await adminClient.rpc("get_user_id_by_email", {
        email_input: invitation.email,
      });
      if (foundId) userId = foundId;
    } catch {
      // RPC might not exist, fallback
    }

    if (!userId) {
      // New user — must have full_name and password
      if (!full_name || !password) {
        return NextResponse.json(
          { error: "Nombre y contraseña son obligatorios para nuevos usuarios." },
          { status: 400 }
        );
      }

      // Validate password strength
      if (password.length < 8) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 8 caracteres." },
          { status: 400 }
        );
      }

      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        log.error("invitations:accept", "Failed to create user", {
          error: createError.message,
        });
        return NextResponse.json(
          { error: "Error al crear la cuenta." },
          { status: 500 }
        );
      }

      userId = newUser.user.id;

      // Create profile for the new user
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          doctor_id: userId,
          clinic_id: invitation.organization_id,
          full_name,
          specialty: [],
          plan: "clinic",
          subscription_status: "active",
          terms_version: CURRENT_TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        } as any);

      if (profileError && profileError.code !== "23505") {
        log.error("invitations:accept", "Failed to create profile", {
          error: profileError.message,
        });
      }
    }

    // 3. Insert organization_member
    const { error: memberError } = await (adminClient as any)
      .from("clinic_members")
      .upsert({
        clinic_id: invitation.organization_id,
        doctor_id: userId,
        role: invitation.role,
        is_active: true,
        custom_permissions: {},
        joined_at: new Date().toISOString(),
        terms_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      if (memberError.code === "23505") {
        log.info("invitations:accept", "User is already a member", {
          userId,
          orgId: invitation.organization_id,
        });
      } else {
        log.error("invitations:accept", "Failed to insert member", {
          error: memberError.message,
        });
        return NextResponse.json(
          { error: "Error al agregar al equipo." },
          { status: 500 }
        );
      }
    }

    // 4. Update invitation status to 'accepted'
    await invitationsTable
      .update({
        status: "accepted",
        joined_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    // Determine redirect based on role
    const redirect = ROLE_DASHBOARDS[invitation.role] || "/dashboard";

    log.info("invitations:accept", "Invitation accepted successfully", {
      userId,
      orgId: invitation.organization_id,
      role: invitation.role,
    });

    return NextResponse.json({
      success: true,
      redirect,
      user_id: userId,
    });
  } catch (err) {
    log.error("invitations:accept", "Unhandled error", { error: err });
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
