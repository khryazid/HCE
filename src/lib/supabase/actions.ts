"use server";

import { createClient as createBrowserClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase.types";
import { CURRENT_TERMS_VERSION } from "@/lib/constants/app";

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
  clinicName?: string;
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

    // 4. Ensure the clinic exists in the clinics table. We upsert just in case.
    const finalClinicName = input.clinicName?.trim() || "Clínica de " + input.fullName.trim();
    const { error: clinicError } = await adminClient
      .from("clinics")
      .upsert({ id: input.clinicId, name: finalClinicName })
      .select()
      .single();

    if (clinicError) {
      console.error("[createTenantProfileWithTrial] Clinic upsert failed:", clinicError);
      return { success: false, error: "Error al registrar la clínica" };
    }

    // 5. Check if user should be platform admin based on app_config
    let isPlatformAdmin = false;
    try {
      const [{ data: userData }, { data: configData }] = await Promise.all([
        adminClient.auth.admin.getUserById(userId),
        adminClient.from("app_config").select("value").eq("key", "admin_email").maybeSingle()
      ]);
      
      if (
        userData?.user?.email && 
        configData?.value && 
        userData.user.email.toLowerCase() === configData.value.toLowerCase()
      ) {
        isPlatformAdmin = true;
      }
    } catch (e) {
      console.error("[createTenantProfileWithTrial] Error checking platform admin status:", e);
    }

    // 6. Create the profile with trial — server-controlled expiration date
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
        terms_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
        onboarding_state: input.plan === "clinic" ? { step: 4, completed: true } : { step: 1, completed: false },
        is_platform_admin: isPlatformAdmin,
      } satisfies ProfileInsert);

    if (insertError) {
      // Handle race condition: another request created the profile simultaneously
      if (insertError.code === "23505") {
        return { success: true };
      }
      console.error("[createTenantProfileWithTrial] Insert profile failed:", insertError);
      return { success: false, error: "Error al crear perfil" };
    }

    // 7. Add user to clinic_members as 'owner' (they are the creator)
    const { error: memberError } = await adminClient
      .from("clinic_members")
      .upsert({
        clinic_id: input.clinicId,
        doctor_id: userId,
        role: "owner",
        is_active: true,
        custom_permissions: {},
        terms_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error("[createTenantProfileWithTrial] Insert member failed:", memberError);
      // We don't fail the whole registration, but log it.
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

/**
 * Registra la aceptación de los Términos y Condiciones actualizados para el usuario actual.
 */
export async function acceptTermsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const browserClient = await createBrowserClient();
    const { data: { user }, error: authError } = await browserClient.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "No autenticado" };
    }

    const adminClient = createAdminClient();
    const activeVersion = await getActiveTermsVersion();

    // Actualizar en profiles
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        terms_version: activeVersion,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("doctor_id", user.id);

    if (profileError) {
      console.error("[acceptTermsAction] Error updating profiles:", profileError);
    }

    // Actualizar en clinic_members (si aplica)
    const { error: memberError } = await adminClient
      .from("clinic_members")
      .update({
        terms_version: activeVersion,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("doctor_id", user.id);

    if (memberError) {
      console.error("[acceptTermsAction] Error updating clinic_members:", memberError);
    }

    return { success: true };
  } catch (err) {
    console.error("[TermsAcceptance] Error", err);
    return { success: false, error: "Error del servidor" };
  }
}

/**
 * Consulta la configuración global desde la base de datos (app_config).
 * Expone términos, modo de mantenimiento y anuncio global.
 */
export async function getPublicGlobalConfig(): Promise<{
  terms_version: string;
  terms_content: string;
  maintenance_mode: boolean;
  global_notice: string;
}> {
  const config: {
    terms_version: string;
    terms_content: string;
    maintenance_mode: boolean;
    global_notice: string;
  } = {
    terms_version: CURRENT_TERMS_VERSION,
    terms_content: "",
    maintenance_mode: false,
    global_notice: "",
  };

  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("app_config")
      .select("key, value")
      .in("key", ["terms_version", "terms_content", "maintenance_mode", "global_notice"]);
      
    if (data) {
      for (const row of data) {
        if (row.key === "terms_version") config.terms_version = row.value;
        if (row.key === "terms_content") config.terms_content = row.value;
        if (row.key === "maintenance_mode") config.maintenance_mode = row.value === "true";
        if (row.key === "global_notice") config.global_notice = row.value;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch global config from DB, falling back to defaults:", e);
  }
  
  return config;
}

/**
 * Consulta la versión activa de los Términos y Condiciones.
 */
export async function getActiveTermsVersion(): Promise<string> {
  const cfg = await getPublicGlobalConfig();
  return cfg.terms_version;
}
