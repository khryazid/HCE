"use server";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "khristian.yazid@gmail.com";

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars for admin");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function verifySuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized");
  }
}

export type AdminUserRecord = {
  id: string;
  email: string | undefined;
  created_at: string;
  full_name: string;
  subscription_status: string;
};

export async function getAllUsersWithProfiles(): Promise<AdminUserRecord[]> {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();
  
  // Get up to 1000 users. For larger scale, pagination is needed.
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) throw authError;
  
  const { data: profiles, error: profError } = await admin.from('profiles').select('*');
  if (profError) throw profError;
  
  return authData.users.map(u => {
    const profile = profiles?.find(p => p.doctor_id === u.id);
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      full_name: profile?.full_name || "Sin Perfil",
      subscription_status: profile?.subscription_status || "none",
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function setSubscriptionStatus(userId: string, status: string) {
  await verifySuperAdmin();
  const admin = getSupabaseAdmin();
  
  const { error } = await admin
    .from('profiles')
    .update({ subscription_status: status })
    .eq('doctor_id', userId);
    
  if (error) throw error;
  
  return { success: true };
}
