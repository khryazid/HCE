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

  const { data: isSuperAdmin, error } = await supabase.rpc("is_super_admin" as never);

  if (error || !isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  const adminEmail = getAdminEmail();
  if (adminEmail && user.email !== adminEmail) {
    console.warn(`[Admin Audit] Admin access granted to ${user.email} (does not match ADMIN_EMAIL)`);
  }

  return user;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let profiles: any[] = [];
  if (userIds.length > 0) {
    const { data, error: profError } = await admin
      .from("profiles")
      .select("doctor_id, full_name, specialty, subscription_status, subscription_expires_at, plan")
      .in("doctor_id", userIds);
    if (profError) throw profError;
    profiles = data || [];
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

