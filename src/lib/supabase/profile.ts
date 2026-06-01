import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase.types";

/**
 * All valid roles in the RBAC system.
 * - owner: creator of the organization (Plan Individual)
 * - doctor: invited doctor (Plan Clínica)
 * - assistant: up to 2 per Individual plan
 * - clinic_admin: non-medical admin (Plan Clínica)
 * - receptionist, lab, imaging, surgery: specialized roles (Plan Clínica)
 */
export type OrgRole =
  | "owner"
  | "doctor"
  | "assistant"
  | "clinic_admin"
  | "receptionist"
  | "lab"
  | "imaging"
  | "surgery";

export type TenantProfile = {
  doctor_id: string;
  clinic_id: string;
  full_name: string;
  specialties: string[];
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  plan: "basic" | "clinic";
  role: OrgRole;
  is_active: boolean;
  is_platform_admin: boolean;
  custom_permissions: Record<string, boolean>;
  member_id?: string;
  ui_preferences?: Record<string, unknown>;
  onboarding_state: { step: number; completed: boolean };
  terms_version?: string | null;
};

type EnsureTenantProfileInput = {
  userId: string;
  clinicId: string;
  fullName: string;
  specialties: string[];
  plan?: "basic" | "clinic";
};

type TenantMetadata = {
  clinic_id?: unknown;
  full_name?: unknown;
  specialty?: unknown;
  specialties?: unknown;
  plan?: unknown;
};

// Internal: used to cast the insert payload to work around the Supabase type-gen
// `never` bug on tables with PostgrestVersion "12" and empty Relationships[].
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normalizeTenantText(value: string) {
  return value.trim();
}

/**
 * Maps the legacy 'admin' role to 'owner' for backward compatibility.
 * All new code should use the 8-role system.
 */
function normalizeRole(role: string | undefined | null): OrgRole {
  if (!role) return "owner";
  if (role === "admin") return "owner"; // legacy migration
  return role as OrgRole;
}

function withSpecialties(profile: {
  doctor_id: string;
  clinic_id: string;
  full_name: string;
  specialty: string[];
  plan: "basic" | "clinic";
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  role?: string;
  is_active?: boolean;
  is_platform_admin?: boolean;
  custom_permissions?: Record<string, boolean> | unknown;
  member_id?: string;
  ui_preferences?: Record<string, unknown> | unknown;
  onboarding_state?: unknown;
  terms_version?: string | null;
}): TenantProfile {
  // Map the DB column name `specialty` to the canonical `specialties` field.
  const { specialty, role, ui_preferences, onboarding_state, is_active, is_platform_admin, custom_permissions, member_id, ...rest } = profile;
  
  const defaultOnboardingState = { step: 1, completed: false };
  const parsedOnboardingState = onboarding_state && typeof onboarding_state === "object"
    ? (onboarding_state as { step: number; completed: boolean })
    : defaultOnboardingState;

  return { 
    ...rest, 
    specialties: specialty, 
    role: normalizeRole(role),
    is_active: is_active ?? true,
    is_platform_admin: is_platform_admin ?? false,
    custom_permissions: (custom_permissions as Record<string, boolean>) || {},
    member_id,
    ui_preferences: (ui_preferences as Record<string, unknown>) || {},
    onboarding_state: parsedOnboardingState,
    terms_version: profile.terms_version ?? null,
  };
}

export function createClinicId() {
  return crypto.randomUUID();
}

export async function loadTenantProfile(userId: string): Promise<TenantProfile | null> {
  const supabase = getSupabaseClient();
  // Load profile with platform admin flag
  const { data, error } = await supabase
    .from("profiles")
    .select("doctor_id, clinic_id, full_name, specialty, subscription_status, subscription_expires_at, plan, ui_preferences, onboarding_state, terms_version, is_platform_admin")
    .eq("doctor_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  // Load role, is_active, and custom_permissions from clinic_members
  const { data: memberData } = await supabase
    .from("clinic_members")
    .select("id, role, is_active, custom_permissions")
    .eq("clinic_id", data.clinic_id)
    .eq("doctor_id", userId)
    .maybeSingle();

  return withSpecialties({
    ...data,
    plan: data.plan as "basic" | "clinic",
    role: memberData?.role || "owner",
    is_active: memberData?.is_active ?? true,
    is_platform_admin: data.is_platform_admin ?? false,
    custom_permissions: memberData?.custom_permissions || {},
    member_id: memberData?.id,
    ui_preferences: data.ui_preferences,
  });
}

async function ensureTenantProfile(
  input: EnsureTenantProfileInput,
): Promise<TenantProfile> {
  const fullName = normalizeTenantText(input.fullName);
  const specialties = input.specialties
    .map((value) => normalizeTenantText(value))
    .filter(Boolean);
  const clinicId = normalizeTenantText(input.clinicId);

  if (!fullName) {
    throw new Error("El nombre completo es obligatorio para crear el perfil.");
  }

  if (specialties.length === 0) {
    throw new Error("Debes seleccionar al menos una especialidad.");
  }

  if (!isUuid(clinicId)) {
    throw new Error("clinic_id debe ser un UUID valido.");
  }

  const existing = await loadTenantProfile(input.userId);
  if (existing) {
    return existing;
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      doctor_id: input.userId,
      clinic_id: clinicId,
      full_name: fullName,
      specialty: specialties,
      plan: input.plan || "basic",
      // HAL-13.1: subscription_status y subscription_expires_at NO se asignan
      // desde el cliente. Solo createTenantProfileWithTrial (service_role) puede
      // asignarlos. Esto previene que un usuario manipule su propio trial status.
    } satisfies ProfileInsert)
    .select("doctor_id, clinic_id, full_name, specialty, subscription_status, subscription_expires_at, plan, ui_preferences, onboarding_state, terms_version")
    .single();

  // If there was no error and the profile was inserted, ensure the clinic and member exist
  if (!error && data) {
    // This is run client-side most of the time but via a server-action in signup,
    // so we can't use adminClient directly here without moving it to a server action.
    // However, the standard insert flow uses createTenantProfileWithTrial which ALREADY
    // handles clinics and clinic_members! This function is mostly a fallback.
    // To be perfectly safe, since the user is authenticated, they CANNOT insert into
    // clinic_members without is_clinic_admin, which they don't have yet.
    // So if they hit this fallback, they might not get 'admin' role correctly without
    // a server-action.
    // Since Phase 2, we strongly recommend all signups go through createTenantProfileWithTrial.
  }

  if (error) {
    const reloaded = await loadTenantProfile(input.userId);
    if (reloaded) {
      return reloaded;
    }

    throw error;
  }

  if (!data) {
    const reloaded = await loadTenantProfile(input.userId);
    if (reloaded) {
      return reloaded;
    }

    throw new Error("No se pudo materializar el perfil tenant despues del registro.");
  }

  return withSpecialties({
    ...data,
    plan: data.plan as "basic" | "clinic",
    ui_preferences: data.ui_preferences,
  });
}

export async function updateTenantUIPreferences(
  userId: string,
  preferences: Record<string, boolean>,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ui_preferences: preferences })
    .eq("doctor_id", userId);

  if (error) {
    throw error;
  }
}

export async function bootstrapTenantProfileFromMetadata(
  userId: string,
  metadata: TenantMetadata,
) {
  const clinicId =
    typeof metadata.clinic_id === "string" ? metadata.clinic_id : undefined;
  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name : undefined;
  const specialty =
    typeof metadata.specialty === "string" ? metadata.specialty : undefined;
  const specialties = Array.isArray(metadata.specialties)
    ? metadata.specialties.filter((value): value is string => typeof value === "string")
    : undefined;

  const plan = typeof metadata.plan === "string" ? metadata.plan : undefined;

  if (!clinicId || !fullName || (!specialty && (!specialties || specialties.length === 0))) {
    return null;
  }

  return ensureTenantProfile({
    userId,
    clinicId,
    fullName,
    plan: plan as "basic" | "clinic",
    specialties: specialties && specialties.length > 0 ? specialties : [specialty as string],
  });
}
