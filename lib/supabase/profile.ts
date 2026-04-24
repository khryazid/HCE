import { getSupabaseClient } from "@/lib/supabase/client";

export type TenantProfile = {
  doctor_id: string;
  clinic_id: string;
  full_name: string;
  specialty: string;
  specialties: string[];
};

type EnsureTenantProfileInput = {
  userId: string;
  clinicId: string;
  fullName: string;
  specialties: string[];
};

type SupabaseInsertError = {
  message: string;
};

type ProfilesInsertClient = {
  insert: (value: {
    doctor_id: string;
    clinic_id: string;
    full_name: string;
    specialty: string;
  }) => {
    select: (columns: string) => {
      single: () => Promise<{
        data: TenantProfile | null;
        error: SupabaseInsertError | null;
      }>;
    };
  };
};

type TenantMetadata = {
  clinic_id?: unknown;
  full_name?: unknown;
  specialty?: unknown;
  specialties?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normalizeTenantText(value: string) {
  return value.trim();
}

function serializeSpecialties(values: string[]) {
  return values.map((value) => normalizeTenantText(value)).filter(Boolean).join(" | ");
}

function parseSpecialties(value: string) {
  const entries = value
    .split("|")
    .map((entry) => normalizeTenantText(entry))
    .filter(Boolean);

  return entries.length > 0 ? entries : [value];
}

function withSpecialties(profile: {
  doctor_id: string;
  clinic_id: string;
  full_name: string;
  specialty: string;
}) {
  return {
    ...profile,
    specialties: parseSpecialties(profile.specialty),
  } satisfies TenantProfile;
}

export function createClinicId() {
  return crypto.randomUUID();
}

export async function loadTenantProfile(userId: string): Promise<TenantProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("doctor_id, clinic_id, full_name, specialty")
    .eq("doctor_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return withSpecialties(data);
}

export async function ensureTenantProfile(
  input: EnsureTenantProfileInput,
): Promise<TenantProfile> {
  const fullName = normalizeTenantText(input.fullName);
  const specialties = input.specialties
    .map((value) => normalizeTenantText(value))
    .filter(Boolean);
  const serializedSpecialty = serializeSpecialties(specialties);
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
  const profilesInsertClient = supabase.from("profiles" as never) as unknown as ProfilesInsertClient;

  const { data, error } = await profilesInsertClient
    .insert({
      doctor_id: input.userId,
      clinic_id: clinicId,
      full_name: fullName,
      specialty: serializedSpecialty,
    })
    .select("doctor_id, clinic_id, full_name, specialty")
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
