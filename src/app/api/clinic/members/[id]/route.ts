import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { serverLog } from "@/lib/observability/server-logger";

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
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

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

    // Obtener info del miembro a borrar para saber si era doctor
    const { data: memberToDelete } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("clinic_members")
      .delete()
      .eq("id", id);

    if (error) {
      // HAL-02: No exponer error.message de Postgres en producción
      log.error("clinic:members", "DELETE error", { error });
      return NextResponse.json(
        { error: sanitizeDbError(error) },
        { status: 400 },
      );
    }

    // Metered Billing: Actualizar Stripe si se eliminó un doctor
    if (memberToDelete?.role === "doctor") {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("plan, stripe_subscription_id")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
        
      if (ownerProfile?.plan === "clinic" && ownerProfile?.stripe_subscription_id) {
        const { count } = await supabase
          .from("clinic_members")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .eq("role", "doctor");
          
        const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
        try {
          const subscription = await stripe.subscriptions.retrieve(ownerProfile.stripe_subscription_id);
          const itemId = subscription.items.data[0]?.id;
          if (itemId) {
            // quantity = doctores restantes + 1 (el dueño)
            await stripe.subscriptionItems.update(itemId, { quantity: (count ?? 0) + 1 });
          }
        } catch (stripeErr) {
          log.error("clinic:members", "Fallo al actualizar Stripe en DELETE", { error: stripeErr });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("clinic:members", "DELETE unexpected error", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const reqId = req.headers.get("x-request-id") ?? "";
  const log = serverLog.withRequestId(reqId);

  try {
    const { id } = await params;

    // HAL-02: Validar body con Zod (consistent con el resto de la app)
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
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

    // Obtener rol actual
    const { data: currentMember } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("clinic_members")
      .update({ role })
      .eq("id", id);

    if (error) {
      log.error("clinic:members", "PATCH error", { error });
      return NextResponse.json(
        { error: sanitizeDbError(error) },
        { status: 400 },
      );
    }

    // Metered Billing: Actualizar Stripe si el rol cambió hacia o desde "doctor"
    if (currentMember?.role !== role && (currentMember?.role === "doctor" || role === "doctor")) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("plan, stripe_subscription_id")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
        
      if (ownerProfile?.plan === "clinic" && ownerProfile?.stripe_subscription_id) {
        const { count } = await supabase
          .from("clinic_members")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .eq("role", "doctor");
          
        const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
        try {
          const subscription = await stripe.subscriptions.retrieve(ownerProfile.stripe_subscription_id);
          const itemId = subscription.items.data[0]?.id;
          if (itemId) {
            await stripe.subscriptionItems.update(itemId, { quantity: (count ?? 0) + 1 });
          }
        } catch (stripeErr) {
          log.error("clinic:members", "Fallo al actualizar Stripe en PATCH", { error: stripeErr });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("clinic:members", "PATCH unexpected error", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

