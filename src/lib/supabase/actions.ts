"use server";

import { createClient as createBrowserClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase.types";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * A-02: Creates the tenant profile with trial status using service_role.
 * This Server Action runs exclusively on the server — the client never has
 * direct access to modify subscription_status or subscription_expires_at.
 *
 * Security:
 * - Uses SUPABASE_SERVICE_ROLE_KEY (never exposed to browser)
 * - Validates the caller's JWT before creating the profile
 * - Checks that no profile already exists (prevents trial extension)
 */
export async function createTenantProfileWithTrial(input: {
  clinicId: string;
  fullName: string;
  specialties: string[];
  plan?: "basic" | "clinic";
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // 1. Verify the caller is authenticated via their own session
    const browserClient = await createBrowserClient();
    const { data: { user }, error: authError } = await browserClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "No autenticado" };
  }

  const userId = user.id;

  // 2. Use service_role to bypass RLS for the insert
  // R-07: Usar createAdminClient() centralizado en lugar de createClient inline
  const adminClient = createAdminClient();

  // 3. Check if profile already exists — prevent trial manipulation
  const { data: existing } = await adminClient
    .from("profiles")
    .select("doctor_id, subscription_status")
    .eq("doctor_id", userId)
    .maybeSingle();

  if (existing) {
    // Profile already exists — do not overwrite subscription_status
    return { success: true };
  }

  // 4. (No existe tabla clinics en el schema de producción actual. 
  // clinic_id es solo un UUID lógico para agrupar usuarios).


  // 5. Create the profile with trial — server-controlled expiration date
  const trialExpiresAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

  const { error: insertError } = await adminClient
    .from("profiles")
    .insert({
      doctor_id: userId,
      clinic_id: input.clinicId,
      full_name: input.fullName.trim(),
      specialty: input.specialties,
      plan: input.plan ?? "basic",
      subscription_status: "trialing",
      subscription_expires_at: trialExpiresAt,
    } satisfies ProfileInsert);

    if (insertError) {
      // Handle race condition: another request created the profile simultaneously
      if (insertError.code === "23505") {
        return { success: true };
      }
      console.error("[createTenantProfileWithTrial] Insert failed:", insertError);
      return { success: false, error: "Error al crear perfil" };
    }

    return { success: true };
  } catch (error) {
    console.error("[createTenantProfileWithTrial] Unhandled error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? `Error interno: ${error.message}` : "Error interno desconocido" 
    };
  }
}
