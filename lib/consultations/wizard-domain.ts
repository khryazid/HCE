import type { PatientRecord } from "@/types/patient";
import type { ClinicalRecordRecord } from "@/types/consultation";

export type WizardValidationInput = {
  patientId: string;
  entryMode: "consulta" | "seguimiento";
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  evolutionStatus: string;
};

export function validateWizardForm(input: WizardValidationInput) {
  const errors: Record<string, string> = {};

  if (!input.patientId) {
    errors.patientId = "Selecciona o crea un paciente.";
  }

  if (input.entryMode === "consulta" && !input.chiefComplaint.trim()) {
    errors.chiefComplaint = "El motivo de consulta es obligatorio.";
  }

  if (!input.diagnosis.trim()) {
    errors.diagnosis = "La impresión diagnóstica es obligatoria.";
  }

  if (input.entryMode === "consulta" && !input.treatmentPlan.trim()) {
    errors.treatmentPlan = "La prescripción es obligatoria para una consulta.";
  }

  if (input.entryMode === "seguimiento" && !input.evolutionStatus.trim()) {
    errors.evolutionStatus = "La evolución es obligatoria para un seguimiento.";
  }

  return errors;
}

type QuickPatientInput = {
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
};

type TenantIdentity = {
  doctor_id: string;
  clinic_id: string;
};

export function buildQuickPatientRecord(
  input: QuickPatientInput,
  tenant: TenantIdentity,
  timestamp: string,
  id: string,
): PatientRecord {
  return {
    id,
    clinic_id: tenant.clinic_id,
    doctor_id: tenant.doctor_id,
    document_number: input.documentNumber.trim(),
    full_name: `${input.firstName.trim()} ${input.lastName.trim()}`,
    birth_date: input.birthDate ? input.birthDate : null,
    status: "activo",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export type FollowUpEditableFields = {
  entryMode: "consulta" | "seguimiento";
  linkedRecordId: string;
  diagnosis: string;
  symptoms: string;
  anamnesis: string;
  treatmentPlan: string;
  cieCodes: string;
};

export type DeepLinkFollowUpEditableFields = FollowUpEditableFields & {
  patientId: string;
  chiefComplaint: string;
  specialtyKind: string;
};

type WizardPatientBackgrounds = {
  pathological: string;
  surgical: string;
  allergic: string;
  pharmacological: string;
  family: string;
  toxic: string;
  gynecoObstetric: string;
};

type WizardAutofillEditableFields = {
  gender: string;
  occupation: string;
  insurance: string;
  medicalHistory: string;
  backgrounds: WizardPatientBackgrounds;
};

export type WizardPendingFollowUp = {
  recordId: string;
  dueDateRaw: string;
  dueDateLabel: string;
  isOverdue: boolean;
  diagnosis: string;
  treatmentPlan: string;
};

const EMPTY_BACKGROUNDS: WizardPatientBackgrounds = {
  pathological: "",
  surgical: "",
  allergic: "",
  pharmacological: "",
  family: "",
  toxic: "",
  gynecoObstetric: "",
};



export function listPatientRecordsByUpdatedAt(
  records: ClinicalRecordRecord[],
  patientId: string,
) {
  if (!patientId) {
    return [] as ClinicalRecordRecord[];
  }

  return records
    .filter((record) => record.patient_id === patientId)
    .sort((first, second) => second.updated_at.localeCompare(first.updated_at));
}

export function buildTimelineRows(
  records: ClinicalRecordRecord[],
  selectedPatientTimelineId: string,
  firstPatientId?: string,
) {
  const targetPatientId = selectedPatientTimelineId || firstPatientId;
  if (!targetPatientId) {
    return [] as ClinicalRecordRecord[];
  }

  return listPatientRecordsByUpdatedAt(records, targetPatientId);
}

export function buildPendingFollowUp(
  latestPatientRecord: ClinicalRecordRecord | null,
  now = Date.now(),
): WizardPendingFollowUp | null {
  if (!latestPatientRecord) {
    return null;
  }

  const data = latestPatientRecord.specialty_data as Record<string, unknown>;
  const dueDateRaw =
    typeof data.next_follow_up_date === "string"
      ? data.next_follow_up_date
      : null;

  if (!dueDateRaw) {
    return null;
  }

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const diagnosis =
    typeof data.diagnosis === "string" && data.diagnosis.trim().length > 0
      ? data.diagnosis
      : latestPatientRecord.chief_complaint;

  return {
    recordId: latestPatientRecord.id,
    dueDateRaw,
    dueDateLabel: dueDate.toLocaleDateString("es-EC"),
    isOverdue: dueDate.getTime() < now,
    diagnosis,
    treatmentPlan:
      typeof data.treatment_plan === "string" &&
      data.treatment_plan.trim().length > 0
        ? data.treatment_plan
        : "",
  };
}

export function buildAutofillFormStatePatch(
  record: ClinicalRecordRecord | null,
): WizardAutofillEditableFields {
  if (!record) {
    return {
      gender: "",
      occupation: "",
      insurance: "",
      medicalHistory: "",
      backgrounds: EMPTY_BACKGROUNDS,
    };
  }

  const specialtyData = (record.specialty_data as Record<string, unknown>) || {};
  const patientSnapshot =
    (specialtyData.patient_snapshot as Record<string, unknown>) || {};
  const rawBackgrounds =
    (specialtyData.backgrounds as Partial<WizardPatientBackgrounds>) || {};

  return {
    gender:
      typeof patientSnapshot.gender === "string" ? patientSnapshot.gender : "",
    occupation:
      typeof patientSnapshot.occupation === "string"
        ? patientSnapshot.occupation
        : "",
    insurance:
      typeof patientSnapshot.insurance === "string" ? patientSnapshot.insurance : "",
    medicalHistory:
      typeof specialtyData.medical_history === "string"
        ? specialtyData.medical_history
        : "",
    backgrounds: {
      pathological: rawBackgrounds.pathological ?? "",
      surgical: rawBackgrounds.surgical ?? "",
      allergic: rawBackgrounds.allergic ?? "",
      pharmacological: rawBackgrounds.pharmacological ?? "",
      family: rawBackgrounds.family ?? "",
      toxic: rawBackgrounds.toxic ?? "",
      gynecoObstetric: rawBackgrounds.gynecoObstetric ?? "",
    },
  };
}

export function buildFollowUpFormState<T extends FollowUpEditableFields>(
  current: T,
  record: ClinicalRecordRecord | null,
): T {
  if (!record) {
    return {
      ...current,
      entryMode: "seguimiento",
    } as T;
  }

  const data = record.specialty_data as Record<string, unknown>;
  const prevDiagnosis = typeof data.diagnosis === "string" ? data.diagnosis : "";
  const prevSymptoms = typeof data.symptoms === "string" ? data.symptoms : "";
  const prevTreatment = typeof data.treatment_plan === "string" ? data.treatment_plan : "";

  return {
    ...current,
    entryMode: "seguimiento",
    linkedRecordId: record.id,
    diagnosis: current.diagnosis || prevDiagnosis,
    symptoms: current.symptoms || prevSymptoms,
    anamnesis:
      current.anamnesis ||
      `Seguimiento de ${prevDiagnosis || "consulta previa"}`,
    treatmentPlan: current.treatmentPlan || prevTreatment,
    cieCodes: current.cieCodes || record.cie_codes.join(", "),
  } as T;
}

export function buildConsultaModeFormState<T extends FollowUpEditableFields>(
  current: T,
): T {
  return {
    ...current,
    entryMode: "consulta",
    linkedRecordId: "",
  } as T;
}

export function buildDeepLinkFollowUpFormState<
  T extends DeepLinkFollowUpEditableFields,
>(
  current: T,
  options: {
    patientId: string;
    record: ClinicalRecordRecord;
  },
): T {
  const data = options.record.specialty_data as Record<string, unknown>;
  const prevDiagnosis = typeof data.diagnosis === "string" ? data.diagnosis : "";
  const prevSymptoms = typeof data.symptoms === "string" ? data.symptoms : "";
  const prevTreatment = typeof data.treatment_plan === "string" ? data.treatment_plan : "";

  return {
    ...current,
    entryMode: "seguimiento",
    patientId: options.patientId,
    linkedRecordId: options.record.id,
    diagnosis: prevDiagnosis,
    symptoms: prevSymptoms,
    chiefComplaint: "Control de seguimiento",
    anamnesis: `Seguimiento de ${prevDiagnosis || "consulta previa"}`,
    treatmentPlan: prevTreatment,
    cieCodes: options.record.cie_codes.join(", "),
    specialtyKind: options.record.specialty_kind,
  } as T;
}