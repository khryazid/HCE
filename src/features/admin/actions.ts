"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

// ─── SUPER-ADMIN CONFIG ────────────────────────────────────────────────────────
// Only this email has access to the /admin panel.
const ADMIN_EMAIL = "khristian.yazid@gmail.com";

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
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized");
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
};

export type AdminStats = {
  total: number;
  active: number;
  lifetime: number;
  inactive: number;
  none: number;
};

// ─── QUERIES ───────────────────────────────────────────────────────────────────
export async function getAllUsersWithProfiles(): Promise<{
  users: AdminUserRecord[];
  stats: AdminStats;
}> {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) throw authError;

  const { data: profiles, error: profError } = await admin
    .from("profiles")
    .select("doctor_id, full_name, specialty, subscription_status, subscription_expires_at");
  if (profError) throw profError;

  const users: AdminUserRecord[] = authData.users
    .map((u) => {
      const profile = (profiles ?? []).find((p) => p.doctor_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        full_name: profile?.full_name ?? "Sin Perfil",
        specialty: profile?.specialty ?? "—",
        subscription_status: profile?.subscription_status ?? "none",
        subscription_expires_at: profile?.subscription_expires_at ?? null,
      };
    })
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const stats: AdminStats = {
    total: users.length,
    active: users.filter((u) => u.subscription_status === "active").length,
    lifetime: users.filter((u) => u.subscription_status === "lifetime").length,
    inactive: users.filter((u) => u.subscription_status === "inactive").length,
    none: users.filter((u) => u.subscription_status === "none" || !u.subscription_status).length,
  };

  return { users, stats };
}

// ─── MUTATIONS ─────────────────────────────────────────────────────────────────

/**
 * Set a subscription plan for a user.
 * @param userId        Supabase auth user ID
 * @param status        "active" | "lifetime" | "inactive"
 * @param durationDays  Optional. If set, computes expiry = now + N days. Ignored for "lifetime".
 */
export async function setSubscriptionStatus(
  userId: string,
  status: string,
  durationDays?: number
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
  } else if (status === "inactive") {
    expires_at = null;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: status,
      subscription_expires_at: expires_at,
    })
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
