import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/invitations/validate?token=xxx
 *
 * Validates an invitation token and returns the invitation data.
 * Does NOT require authentication — the token IS the authentication.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token de invitación requerido." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // NOTE: `invitations` table not yet in supabase.types.ts — cast through `any`
    // until `npm run db:types` is run after the migration is applied.
    const invitationsTable = (adminClient as any).from("invitations");

    // Look up the invitation by token
    const { data: invitation, error } = await invitationsTable
      .select("id, organization_id, email, role, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada. Verifica el enlace o contacta al administrador." },
        { status: 404 }
      );
    }

    // Check status
    if (invitation.status !== "pending") {
      const statusMessages: Record<string, string> = {
        accepted: "Esta invitación ya fue aceptada.",
        expired: "Esta invitación ha expirado. Solicita una nueva al administrador.",
      };
      return NextResponse.json(
        { error: statusMessages[invitation.status] || "Invitación inválida." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Auto-expire the invitation
      await invitationsTable
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return NextResponse.json(
        { error: "Esta invitación ha expirado. Solicita una nueva al administrador." },
        { status: 400 }
      );
    }

    // Get organization name
    const { data: org } = await adminClient
      .from("clinics")
      .select("name")
      .eq("id", invitation.organization_id)
      .maybeSingle();

    // Check if user already exists in auth
    let userExists = false;
    try {
      const { data: userList } = await adminClient.rpc("get_user_id_by_email", {
        email_input: invitation.email,
      });
      userExists = !!userList;
    } catch {
      // RPC might not exist yet — best-effort check
    }

    return NextResponse.json({
      invitation: {
        invitation_id: invitation.id,
        organization_id: invitation.organization_id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expires_at: invitation.expires_at,
        organization_name: org?.name || "Organización",
      },
      user_exists: userExists,
    });
  } catch (err) {
    console.error("[invitations/validate] Error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
