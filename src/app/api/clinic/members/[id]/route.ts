import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// HAL-01: Verificar que el usuario autenticado es admin de la clínica del miembro
// antes de operar. Defensa en profundidad sobre la política RLS de clinic_members_write.
async function resolveTargetMemberClinic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("id", memberId)
    .maybeSingle();
  return data?.clinic_id ?? null;
}

async function assertIsClinicAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clinicId: string,
): Promise<boolean> {
  // El dueño de la clínica tiene una fila en profiles con su clinic_id
  const { data: ownerRow } = await supabase
    .from("profiles")
    .select("doctor_id")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", userId)
    .maybeSingle();

  if (ownerRow) return true;

  // También puede ser admin via clinic_members
  const { data: memberRow } = await supabase
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", userId)
    .maybeSingle();

  return memberRow?.role === "admin";
}

// HAL-02: Mensajes de error genéricos en producción
function sanitizeDbError(error: { code?: string; message?: string }): string {
  if (process.env.NODE_ENV === "development") {
    return error.message ?? "Error de base de datos";
  }
  // Mapear errores conocidos a mensajes seguros
  if (error.code === "23505") return "Ya existe un registro con esos datos";
  if (error.code === "23503") return "Referencia inválida";
  return "Error interno del servidor";
}

const patchBodySchema = z.object({
  role: z.enum(["admin", "doctor", "assistant"] as const, {
    error: () => "Rol debe ser 'admin', 'doctor' o 'assistant'",
  }),
});

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // HAL-01: Verificar admin antes de borrar
    const clinicId = await resolveTargetMemberClinic(supabase, id);
    if (!clinicId) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    const isAdmin = await assertIsClinicAdmin(supabase, user.id, clinicId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Solo los administradores pueden eliminar miembros" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("clinic_members")
      .delete()
      .eq("id", id);

    if (error) {
      // HAL-02: No exponer error.message de Postgres en producción
      console.error("[clinic/members] DELETE error:", error);
      return NextResponse.json(
        { error: sanitizeDbError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[clinic/members] DELETE unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // HAL-02: Validar body con Zod (consistent con el resto de la app)
    const rawBody = await req.json();
    const parsed = patchBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido" },
        { status: 400 },
      );
    }
    const { role } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // HAL-01: Verificar admin antes de cambiar rol
    const clinicId = await resolveTargetMemberClinic(supabase, id);
    if (!clinicId) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    const isAdmin = await assertIsClinicAdmin(supabase, user.id, clinicId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Solo los administradores pueden cambiar roles" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("clinic_members")
      .update({ role })
      .eq("id", id);

    if (error) {
      console.error("[clinic/members] PATCH error:", error);
      return NextResponse.json(
        { error: sanitizeDbError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[clinic/members] PATCH unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

