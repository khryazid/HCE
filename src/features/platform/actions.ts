"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

// ─── SUPER-ADMIN CONFIG ────────────────────────────────────────────────────────
// The admin email is read from the ADMIN_EMAIL environment variable.
// Set it in .env.local (development) and in the Vercel/hosting dashboard (production).
function getAdminEmail(): string | undefined {
  return process.env.ADMIN_EMAIL;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing env var: SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── AUTH GUARD ────────────────────────────────────────────────────────────────
export async function verifySuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const adminEmail = getAdminEmail();

  // F-41: Fix — is_super_admin() ahora existe en el schema SQL.
  // Usar el client del servidor (que viaja con las cookies del usuario) para
  // invocar la RPC — la funcion internamente verifica auth.uid().
  // Nota: los tipos generados se actualizan con `npm run db:types` tras aplicar
  // el SQL de is_super_admin() en el dashboard de Supabase. Hasta entonces,
  // se usa `as any` para evitar error de compilacion en el tipo de la RPC.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: isSuperAdmin, error: rpcError } = await (supabase as any).rpc("is_super_admin");

  // Permitir si la RPC confirma super-admin
  if (!rpcError && isSuperAdmin === true) {
    return user;
  }

  // Fallback secundario: ADMIN_EMAIL como respaldo de emergencia.
  // NOTA: Esto es menos seguro que la RPC porque depende del email como identidad.
  // Se mantiene solo para compatibilidad mientras se migra a custom claims.
  const isEmailAdmin = adminEmail != null && user.email === adminEmail;
  if (isEmailAdmin) {
    console.warn(
      `[Admin Audit] Admin access via ADMIN_EMAIL fallback for ${user.email}. ` +
      `Migrate to raw_user_meta_data.role='super_admin' for stronger guarantees.`
    );
    return user;
  }

  if (rpcError) {
    console.error("[Admin] is_super_admin RPC error:", rpcError.message);
  }

  throw new Error("Unauthorized");
}

// ─── TYPES ─────────────────────────────────────────────────────────────────────
export type AdminUserRecord = {
  id: string;
  email: string | undefined;
  created_at: string;
  full_name: string;
  specialty: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  plan: string;
};

export type AdminStats = {
  total: number;
  active: number;
  lifetime: number;
  inactive: number;
  none: number;
};

// ─── QUERIES ───────────────────────────────────────────────────────────────────
export async function getAbandonedSyncItems() {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("audit_logs")
    .select("id, clinic_id, doctor_id, resource_type, resource_id, changes, created_at")
    .eq("event_type", "sync_abandoned")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return data;
}

export async function getAllUsersWithProfiles(page: number = 1, limit: number = 50): Promise<{
  users: AdminUserRecord[];
  stats: AdminStats;
  totalItems: number;
  totalPages: number;
}> {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  // Para las stats globales
  const { data: allProfiles, error: profStatsError } = await admin
    .from("profiles")
    .select("subscription_status");
  if (profStatsError) throw profStatsError;

  const stats: AdminStats = {
    total: allProfiles.length,
    active: allProfiles.filter((p) => p.subscription_status === "active").length,
    lifetime: allProfiles.filter((p) => p.subscription_status === "lifetime").length,
    inactive: allProfiles.filter((p) => p.subscription_status === "canceled").length,
    none: allProfiles.filter((p) => p.subscription_status === "none" || !p.subscription_status).length,
  };

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page,
    perPage: limit,
  });
  if (authError) throw authError;

  const userIds = authData.users.map((u) => u.id);

  type ProfileRow = {
    doctor_id: string;
    full_name: string | null;
    specialty: string | string[] | null;
    subscription_status: string | null;
    subscription_expires_at: string | null;
    plan: string | null;
  };
  let profiles: ProfileRow[] = [];
  if (userIds.length > 0) {
    const { data, error: profError } = await admin
      .from("profiles")
      .select("doctor_id, full_name, specialty, subscription_status, subscription_expires_at, plan")
      .in("doctor_id", userIds);
    if (profError) throw profError;
    profiles = (data || []) as ProfileRow[];
  }

  const users: AdminUserRecord[] = authData.users
    .map((u) => {
      const profile = profiles.find((p) => p.doctor_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        full_name: profile?.full_name ?? "Sin Perfil",
        specialty: Array.isArray(profile?.specialty) ? profile.specialty.join(", ") : (profile?.specialty ?? "—"),
        subscription_status: profile?.subscription_status ?? "none",
        subscription_expires_at: profile?.subscription_expires_at ?? null,
        plan: profile?.plan ?? "basic",
      };
    })
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const totalItems = stats.total;
  const totalPages = Math.ceil(totalItems / limit);

  return { users, stats, totalItems, totalPages };
}

// ─── MUTATIONS ─────────────────────────────────────────────────────────────────

/**
 * Set a subscription plan for a user.
 * @param userId        Supabase auth user ID
 * @param status        "active" | "lifetime" | "canceled"
 * @param durationDays  Optional. If set, computes expiry = now + N days. Ignored for "lifetime".
 * @param plan          "basic" | "clinic"
 */
export async function setSubscriptionStatus(
  userId: string,
  status: string,
  durationDays?: number,
  plan?: string
) {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  let expires_at: string | null = null;

  if (status === "lifetime") {
    // Lifetime never expires
    expires_at = null;
  } else if (status === "active" && durationDays && durationDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    expires_at = d.toISOString();
  } else if (status === "canceled") {
    expires_at = null;
  }

  const updatePayload: { subscription_status: string; subscription_expires_at: string | null; plan?: string } = {
    subscription_status: status,
    subscription_expires_at: expires_at,
  };

  if (plan) {
    updatePayload.plan = plan;
  }

  const { error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("doctor_id", userId);

  if (error) throw error;
  return { success: true, expires_at };
}

/**
 * Add notes / internal label to a user (stored in subscription_status prefix trick).
 * For now, just a no-op stub to extend later.
 */
export async function deleteUserAccount(userId: string) {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  // M-20: Limpiar bucket clinic_assets antes de borrar la cuenta
  try {
    const { data: files } = await admin.storage
      .from("clinic_assets")
      .list(userId);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${userId}/${f.name}`);
      const { error: storageError } = await admin.storage
        .from("clinic_assets")
        .remove(filePaths);
      
      if (storageError) {
        console.warn(`[Admin] No se pudieron borrar algunos archivos del usuario ${userId}:`, storageError);
      }
    }
  } catch (err) {
    console.warn(`[Admin] Error intentando limpiar clinic_assets para ${userId}:`, err);
  }

  // Delete profile first (FK cascade should handle the rest)
  const { error: profError } = await admin
    .from("profiles")
    .delete()
    .eq("doctor_id", userId);
  if (profError) throw profError;

  // Delete the auth user
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw authError;

  return { success: true };
}

/**
 * Update public pricing in app_config
 */
export async function updatePricing(proPrice: number, clinicPrice: number) {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  // Upsert both prices
  const { error: err1 } = await admin.from("app_config").upsert({
    key: "plan_pro_price",
    value: proPrice.toString(),
    updated_at: new Date().toISOString()
  });
  if (err1) throw err1;

  const { error: err2 } = await admin.from("app_config").upsert({
    key: "plan_clinic_price",
    value: clinicPrice.toString(),
    updated_at: new Date().toISOString()
  });
  if (err2) throw err2;

  return { success: true };
}

// ─── CLINICS & GLOBAL CONFIG ───────────────────────────────────────────────────

export type AdminClinicRecord = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  // Representamos el estado dominante de la clinica basado en sus miembros.
  dominant_status: string;
  dominant_expires_at: string | null;
  dominant_plan: string;
};

export async function getAllClinics(): Promise<AdminClinicRecord[]> {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  const { data: clinics, error: clinicsErr } = await admin
    .from("clinics")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (clinicsErr) throw clinicsErr;

  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select("clinic_id, subscription_status, subscription_expires_at, plan");

  if (profErr) throw profErr;

  return clinics.map((c) => {
    const members = profiles.filter((p) => p.clinic_id === c.id);
    // Tomamos el primer miembro (usualmente el dueño) como referencia
    const ref = members[0];
    return {
      id: c.id,
      name: c.name,
      created_at: c.created_at,
      member_count: members.length,
      dominant_status: ref?.subscription_status ?? "none",
      dominant_expires_at: ref?.subscription_expires_at ?? null,
      dominant_plan: ref?.plan ?? "basic",
    };
  });
}

/**
 * Aplica un plan a TODOS los perfiles de una clinica especifica.
 */
export async function setClinicSubscriptionStatus(
  clinicId: string,
  status: string,
  durationDays?: number,
  plan?: string
) {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  let expires_at: string | null = null;
  if (status === "lifetime") {
    expires_at = null;
  } else if (status === "active" && durationDays && durationDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    expires_at = d.toISOString();
  } else if (status === "canceled") {
    expires_at = null;
  }

  const updatePayload: { subscription_status: string; subscription_expires_at: string | null; plan?: string } = {
    subscription_status: status,
    subscription_expires_at: expires_at,
  };

  if (plan) updatePayload.plan = plan;

  const { error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("clinic_id", clinicId);

  if (error) throw error;
  return { success: true, expires_at };
}

export async function getGlobalConfig() {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("app_config").select("key, value");
  if (error) throw error;

  const conf: Record<string, string> = {};
  for (const row of data) conf[row.key] = row.value;

  return {
    terms_version: conf["terms_version"] || "1.0.0",
    terms_content: conf["terms_content"] || "",
    maintenance_mode: conf["maintenance_mode"] === "true",
    global_notice: conf["global_notice"] || "",
  };
}

export async function updateGlobalConfig(
  termsVersion: string,
  termsContent: string,
  maintenanceMode: boolean,
  globalNotice: string
) {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  const updates = [
    { key: "terms_version", value: termsVersion, updated_at: new Date().toISOString() },
    { key: "terms_content", value: termsContent, updated_at: new Date().toISOString() },
    { key: "maintenance_mode", value: maintenanceMode ? "true" : "false", updated_at: new Date().toISOString() },
    { key: "global_notice", value: globalNotice, updated_at: new Date().toISOString() },
  ];

  for (const payload of updates) {
    const { error } = await admin.from("app_config").upsert(payload);
    if (error) throw error;
  }

  return { success: true };
}

