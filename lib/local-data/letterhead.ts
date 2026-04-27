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

export function saveLetterheadSettings(
  doctorId: string,
  clinicId: string,
  settings: LetterheadSettings,
) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

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
      logo_data_url: settings.logo_data_url || "",
      signature_data_url: settings.signature_data_url || "",
    }),
  );
}
