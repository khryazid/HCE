import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase.types";

export type TenantProfile = {
  doctor_id: string;
  clinic_id: string;
  full_name: string;
  /** Array of medical specialties for this doctor (canonical field — maps to `specialty` column in DB). */
  specialties: string[];
  subscription_status?: string | null;
  role: "admin" | "doctor" | "viewer";
};

type EnsureTenantProfileInput = {
  userId: string;
  clinicId: string;
  fullName: string;
  specialties: string[];
};

type TenantMetadata = {
  clinic_id?: unknown;
  full_name?: unknown;
  specialty?: unknown;
  specialties?: unknown;
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

function withSpecialties(profile: {
  doctor_id: string;
  clinic_id: string;
  full_name: string;
  specialty: string[];
  subscription_status?: string | null;
  role?: "admin" | "doctor" | "viewer";
}): TenantProfile {
  // Map the DB column name `specialty` to the canonical `specialties` field.
  const { specialty, role, ...rest } = profile;
  return { ...rest, specialties: specialty, role: role || "admin" };
}

export function createClinicId() {
  return crypto.randomUUID();
}

export async function loadTenantProfile(userId: string): Promise<TenantProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("doctor_id, clinic_id, full_name, specialty, subscription_status")
    .eq("doctor_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  // Cargar rol de clinic_members
  const { data: memberData } = await supabase
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", data.clinic_id)
    .eq("doctor_id", userId)
    .maybeSingle();

  return withSpecialties({
    ...data,
    role: (memberData?.role as "admin" | "doctor" | "viewer") || "admin",
  });
}

export async function ensureTenantProfile(
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
    } satisfies ProfileInsert)
    .select("doctor_id, clinic_id, full_name, specialty, subscription_status")
    .single();

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

  return withSpecialties(data);
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

  if (!clinicId || !fullName || (!specialty && (!specialties || specialties.length === 0))) {
    return null;
  }

  return ensureTenantProfile({
    userId,
    clinicId,
    fullName,
    specialties: specialties && specialties.length > 0 ? specialties : [specialty as string],
  });
}
