import { getSupabaseClient } from "@/lib/supabase/client";
import { APP_EVENT_ONBOARDING_SAVED, emitAppEvent } from "@/lib/observability/app-events";

export type DoctorOnboardingProfile = {
  professional_title: string;
  license_number: string;
  years_experience: number;
  primary_phone: string;
  secondary_phone?: string;
  professional_address: string;
  public_contact_email?: string;
  signature_name: string;
};

type UnknownRecord = Record<string, unknown>;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalTrimmedString(value: unknown) {
  const normalized = asTrimmedString(value);
  return normalized.length > 0 ? normalized : undefined;
}

function asNonNegativeInteger(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.floor(numberValue));
}

export function readOnboardingProfile(metadata: unknown): DoctorOnboardingProfile | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const root = metadata as UnknownRecord;
  const onboarding =
    root.onboarding_profile && typeof root.onboarding_profile === "object"
      ? (root.onboarding_profile as UnknownRecord)
      : null;

  if (!onboarding) {
    return null;
  }

  const profile: DoctorOnboardingProfile = {
    professional_title: asTrimmedString(onboarding.professional_title),
    license_number: asTrimmedString(onboarding.license_number),
    years_experience: asNonNegativeInteger(onboarding.years_experience),
    primary_phone: asTrimmedString(onboarding.primary_phone),
    secondary_phone: asOptionalTrimmedString(onboarding.secondary_phone),
    professional_address: asTrimmedString(onboarding.professional_address),
    public_contact_email: asOptionalTrimmedString(onboarding.public_contact_email),
    signature_name: asTrimmedString(onboarding.signature_name),
  };

  if (!isOnboardingProfileComplete(profile)) {
    return null;
  }

  return profile;
}

export function isOnboardingProfileComplete(profile: DoctorOnboardingProfile | null) {
  if (!profile) {
    return false;
  }

  return (
    profile.professional_title.length > 0 &&
    profile.license_number.length > 0 &&
    profile.primary_phone.length > 0 &&
    profile.professional_address.length > 0 &&
    profile.signature_name.length > 0
  );
}

export async function saveOnboardingProfile(profile: DoctorOnboardingProfile) {
  const normalizedProfile: DoctorOnboardingProfile = {
    professional_title: profile.professional_title.trim(),
    license_number: profile.license_number.trim(),
    years_experience: Math.max(0, Math.floor(profile.years_experience)),
    primary_phone: profile.primary_phone.trim(),
    secondary_phone: profile.secondary_phone?.trim() || undefined,
    professional_address: profile.professional_address.trim(),
    public_contact_email: profile.public_contact_email?.trim() || undefined,
    signature_name: profile.signature_name.trim(),
  };

  if (!isOnboardingProfileComplete(normalizedProfile)) {
    throw new Error("Completa todos los campos obligatorios del perfil profesional.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      onboarding_complete: true,
      onboarding_profile: normalizedProfile,
    },
  });

  if (error) {
    throw error;
  }

  const clinicId = typeof data.user?.user_metadata?.clinic_id === "string"
    ? data.user.user_metadata.clinic_id
    : null;

  try {
    if (clinicId && data.user) {
      await supabase.rpc("log_audit_event", {
        p_clinic_id: clinicId,
        p_doctor_id: data.user.id,
        p_event_type: "update",
        p_resource_type: "onboarding",
        p_resource_id: data.user.id,
        p_changes: {
          onboarding_profile: normalizedProfile,
        },
        p_metadata: {
          source: "onboarding_form",
        },
      } as never);
    }
  } catch {
    // No bloquear onboarding si auditoria RPC no esta disponible en entorno local.
  }

  emitAppEvent(APP_EVENT_ONBOARDING_SAVED, {
    doctorId: data.user.id,
    clinicId,
  });

  return data.user;
}
