type TreatmentTemplateVersion = {
  version: number;
  notes: string;
  updated_at: string;
};

export type TreatmentTemplate = {
  id: string;
  doctor_id: string;
  clinic_id: string;
  trigger: string;
  title: string;
  treatment: string;
  current_version: number;
  versions: TreatmentTemplateVersion[];
  created_at: string;
  updated_at: string;
};

type TreatmentTemplateInput = {
  doctor_id: string;
  clinic_id: string;
  trigger: string;
  title: string;
  treatment: string;
};

function key(doctorId: string, clinicId: string) {
  return `hce:treatment_templates:${doctorId}:${clinicId}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseTemplates(value: string | null): TreatmentTemplate[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as TreatmentTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function listTreatmentTemplates(doctorId: string, clinicId: string) {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const value = storage.getItem(key(doctorId, clinicId));
  return parseTemplates(value).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function saveTreatmentTemplate(
  template: TreatmentTemplateInput,
  existing?: TreatmentTemplate,
) {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const current = listTreatmentTemplates(template.doctor_id, template.clinic_id);
  const timestamp = nowIso();

  const next = buildNextTemplate(template, existing, timestamp);

  const merged = existing
    ? current.map((item) => (item.id === existing.id ? next : item))
    : [next, ...current];

  storage.setItem(key(template.doctor_id, template.clinic_id), JSON.stringify(merged));
  return next;
}

export function buildNextTemplate(
  template: TreatmentTemplateInput,
  existing?: TreatmentTemplate,
  timestamp = nowIso(),
): TreatmentTemplate {
  return existing
    ? {
        ...existing,
        trigger: template.trigger.trim(),
        title: template.title.trim(),
        treatment: template.treatment.trim(),
        current_version: existing.current_version + 1,
        versions: [
          ...existing.versions,
          {
            version: existing.current_version + 1,
            notes: template.treatment.trim(),
            updated_at: timestamp,
          },
        ],
        updated_at: timestamp,
      }
    : {
        id: crypto.randomUUID(),
        doctor_id: template.doctor_id,
        clinic_id: template.clinic_id,
        trigger: template.trigger.trim(),
        title: template.title.trim(),
        treatment: template.treatment.trim(),
        current_version: 1,
        versions: [
          {
            version: 1,
            notes: template.treatment.trim(),
            updated_at: timestamp,
          },
        ],
        created_at: timestamp,
        updated_at: timestamp,
      };
}

export function deleteTreatmentTemplate(
  doctorId: string,
  clinicId: string,
  id: string,
) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const current = listTreatmentTemplates(doctorId, clinicId);
  const next = current.filter((item) => item.id !== id);
  storage.setItem(key(doctorId, clinicId), JSON.stringify(next));
}
