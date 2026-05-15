import { readOnboardingProfile } from "@/lib/supabase/onboarding";
import { getSupabaseClient } from "@/lib/supabase/client";

export type LetterheadSettings = {
  doctor_name: string;
  professional_title: string;
  specialties: string;
  address: string;
  phone_primary: string;
  phone_secondary?: string;
  contact_email?: string;
  logo_data_url?: string;
  signature_data_url?: string;
};

const DEFAULT_SETTINGS: LetterheadSettings = {
  doctor_name: "",
  professional_title: "",
  specialties: "",
  address: "",
  phone_primary: "",
  phone_secondary: "",
  contact_email: "",
  logo_data_url: "",
  signature_data_url: "",
};

function key(doctorId: string, clinicId: string) {
  return `hce:letterhead:${doctorId}:${clinicId}`;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadLetterheadSettings(doctorId: string, clinicId: string) {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_SETTINGS;
  }

  const raw = storage.getItem(key(doctorId, clinicId));
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LetterheadSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Builds a LetterheadSettings by merging localStorage data with the
 * `onboarding_profile` stored in Supabase user_metadata as a fallback.
 *
 * Priority: localStorage > onboarding_profile > DEFAULT_SETTINGS
 *
 * This ensures the PDF is fully populated even on a new device where
 * localStorage is empty, as long as the doctor completed onboarding.
 *
 * @param doctorId   - The doctor's user ID (used as localStorage key)
 * @param clinicId   - The clinic ID (used as localStorage key)
 * @param userMetadata - The raw `user.user_metadata` from Supabase Auth
 * @param tenantSpecialties - Optional specialties array from the tenant profile
 */
export function buildLetterheadFromSession(
  doctorId: string,
  clinicId: string,
  userMetadata: unknown,
  tenantSpecialties?: string[],
): LetterheadSettings {
  const local = loadLetterheadSettings(doctorId, clinicId);
  const onboarding = readOnboardingProfile(userMetadata);

  // Build fallback from onboarding_profile stored in Supabase user_metadata
  const fallback: LetterheadSettings = {
    doctor_name: onboarding?.signature_name ?? "",
    professional_title: onboarding?.professional_title ?? "",
    specialties: tenantSpecialties?.join(", ") ?? "",
    address: onboarding?.professional_address ?? "",
    phone_primary: onboarding?.primary_phone ?? "",
    phone_secondary: onboarding?.secondary_phone,
    contact_email: onboarding?.public_contact_email,
    logo_data_url: "",
    signature_data_url: "",
  };

  // Merge: localStorage wins for every field that is non-empty
  return {
    doctor_name: local.doctor_name || fallback.doctor_name,
    professional_title: local.professional_title || fallback.professional_title,
    specialties: local.specialties || fallback.specialties,
    address: local.address || fallback.address,
    phone_primary: local.phone_primary || fallback.phone_primary,
    phone_secondary: local.phone_secondary || fallback.phone_secondary,
    contact_email: local.contact_email || fallback.contact_email,
    logo_data_url: local.logo_data_url || fallback.logo_data_url,
    signature_data_url: local.signature_data_url || fallback.signature_data_url,
  };
}

async function uploadDataUrl(dataUrl: string, doctorId: string, type: "logo" | "signature"): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return dataUrl;

  const match = dataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) return dataUrl;

  const mimeType = match[1];
  const b64Data = match[2];
  
  // Convert base64 to Blob
  const byteString = atob(b64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });

  const ext = mimeType.split("/")[1] || "png";
  const fileName = `${doctorId}/${type}-${Date.now()}.${ext}`;

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from("clinic_assets")
    .upload(fileName, blob, { upsert: true, contentType: mimeType });

  if (error) {
    console.error(`Error uploading ${type}:`, error);
    return dataUrl; // fallback a local data url si falla
  }

  const { data: publicUrlData } = supabase.storage
    .from("clinic_assets")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export async function saveLetterheadSettings(
  doctorId: string,
  clinicId: string,
  settings: LetterheadSettings,
) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  // Upload assets if they are data URLs
  const logoUrl = await uploadDataUrl(settings.logo_data_url || "", doctorId, "logo");
  const signatureUrl = await uploadDataUrl(settings.signature_data_url || "", doctorId, "signature");

  storage.setItem(
    key(doctorId, clinicId),
    JSON.stringify({
      ...settings,
      doctor_name: settings.doctor_name.trim(),
      professional_title: settings.professional_title.trim(),
      specialties: settings.specialties.trim(),
      address: settings.address.trim(),
      phone_primary: settings.phone_primary.trim(),
      phone_secondary: settings.phone_secondary?.trim() || "",
      contact_email: settings.contact_email?.trim() || "",
      logo_data_url: logoUrl,
      signature_data_url: signatureUrl,
    }),
  );
}
