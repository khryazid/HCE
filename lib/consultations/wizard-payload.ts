import type { SpecialtyKind } from "@/types/clinical";
import type { ClinicalRecordRecord, SpecialtyDataRow } from "@/types/consultation";
import { normalizeCommaValues } from "@/lib/consultations/workflow";

type WizardPatientSnapshot = {
  gender: string;
  occupation: string;
  insurance: string;
};

type WizardVitals = {
  bloodPressure: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
};

export type ConsultationPayloadInput = {
  tenant: {
    clinicId: string;
    doctorId: string;
  };
  patientId: string;
  specialtyKind: SpecialtyKind;
  entryMode: "consulta" | "seguimiento";
  linkedRecordId: string;
  chiefComplaint: string;
  anamnesis: string;
  symptoms: string;
  medicalHistory: string;
  backgrounds: Record<string, string>;
  vitalSigns: WizardVitals;
  physicalExam: string;
  diagnosis: string;
  clinicalAnalysis: string;
  treatmentTemplateId: string;
  treatmentPlan: string;
  recommendations: string;
  warningSigns: string;
  evolutionStatus: string;
  nextFollowUpDate: string;
  patientSnapshot: WizardPatientSnapshot;
  fallbackTreatmentPlan: string;
  timestamp: string;
  recordId: string;
  specialtyId: string;
  cieCodes: string;
};

type ConsultationPayloadBundle = {
  record: ClinicalRecordRecord;
  specialtyRow: SpecialtyDataRow;
};

export function buildConsultationPayload(
  input: ConsultationPayloadInput,
): ConsultationPayloadBundle {
  const finalTreatment = input.treatmentPlan.trim() || input.fallbackTreatmentPlan;
  const generatedCieCodes = normalizeCommaValues(input.cieCodes);

  const specialtyData = {
    specialty_kind: input.specialtyKind,
    schema_version: 3,
    recorded_at: input.timestamp,
    doctor_id: input.tenant.doctorId,
    patient_snapshot: input.patientSnapshot,
    chief_complaint: input.chiefComplaint.trim(),
    anamnesis: input.anamnesis.trim(),
    symptoms: input.symptoms.trim(),
    medical_history: input.medicalHistory.trim(),
    backgrounds: input.backgrounds,
    vital_signs: input.vitalSigns,
    physical_exam: input.physicalExam.trim(),
    diagnosis: input.diagnosis.trim(),
    clinical_analysis: input.clinicalAnalysis.trim(),
    treatment_plan: finalTreatment,
    recommendations: input.recommendations.trim(),
    warning_signs: input.warningSigns.trim(),
    treatment_template_id: input.treatmentTemplateId || null,
    evolution_status: input.evolutionStatus.trim() || null,
    next_follow_up_date: input.nextFollowUpDate || null,
    follow_up_mode: input.entryMode,
    linked_record_id: input.entryMode === "seguimiento" ? input.linkedRecordId || null : null,
  };

  const record: ClinicalRecordRecord = {
    id: input.recordId,
    clinic_id: input.tenant.clinicId,
    doctor_id: input.tenant.doctorId,
    patient_id: input.patientId,
    chief_complaint: input.chiefComplaint.trim() || "Consulta médica",
    cie_codes: generatedCieCodes,
    specialty_kind: input.specialtyKind,
    specialty_data: specialtyData,
    created_at: input.timestamp,
    updated_at: input.timestamp,
  };

  const specialtyRow: SpecialtyDataRow = {
    id: input.specialtyId,
    clinic_id: input.tenant.clinicId,
    doctor_id: input.tenant.doctorId,
    clinical_record_id: record.id,
    specialty_kind: input.specialtyKind,
    data: specialtyData,
    created_at: input.timestamp,
    updated_at: input.timestamp,
  };

  return {
    record,
    specialtyRow,
  };
}

export function buildConsultationSuccessMessage(options: {
  entryMode: "consulta" | "seguimiento";
  generatedPdf: boolean;
}) {
  if (options.generatedPdf) {
    return options.entryMode === "seguimiento"
      ? "Seguimiento guardado y evolucion actualizada con PDF generado."
      : "Consulta guardada con flujo guiado y PDF generado.";
  }

  return options.entryMode === "seguimiento"
    ? "Seguimiento guardado sin generar PDF."
    : "Consulta guardada sin generar PDF.";
}