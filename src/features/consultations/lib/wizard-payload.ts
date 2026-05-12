import type { SpecialtyKind } from "@/features/consultations/types/clinical";
import type { ClinicalRecordRecord, SpecialtyDataRow } from "@/features/consultations/types";
import { normalizeCommaValues } from "@/features/consultations/lib/workflow";

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
  physicalExam: { system: string; content: string }[];
  diagnosis: string;
  clinicalAnalysis: string;
  treatmentTemplateId: string;
  treatmentPlan: string;
  recommendations: string;
  warningSigns: string;
  labOrders?: string[];
  imagingOrders?: string[];
  evolutionStatus: string;
  nextFollowUpDate: string;
  patientSnapshot: WizardPatientSnapshot;
  fallbackTreatmentPlan: string;
  timestamp: string;
  recordId: string;
  specialtyId: string;
  cieCodes: string;
  // --- NUEVOS ---
  consultationType?: string;
  informantSource?: string;
  informantReliability?: string;
  referringDoctor?: string;
  reviewOfSystems?: Record<string, { present: boolean; notes: string }>;
  generalCondition?: string;
  painScale?: number | null;
  meanArterialPressure?: string;
  currentMedications?: Array<{ id: string; name: string; dose: string; frequency: string; since: string }>;
  soapSubjective?: string;
  soapObjective?: string;
  soapAssessment?: string;
  soapPlan?: string;
  prognosisVital?: string;
  prognosisFunctional?: string;
  pediatricData?: { headCircumference: string; developmentStage: string; vaccineStatus: string } | null;
  /** Tipo de sangre ABO + Rh. */
  bloodType?: string;
  /** Contacto de emergencia médico-legal. */
  emergencyContact?: { name: string; relationship: string; phone: string } | null;
  /** Órdenes Intrahospitalarias / Medidas Generales. */
  medicalOrders?: { diet_type: string; general_measures: string; nursing_cares: string } | null;
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
    physical_exam: input.physicalExam
      .map((ex) => `**${ex.system.toUpperCase()}**\n${ex.content.trim()}`)
      .join("\n\n"),
    physical_exam_structured: input.physicalExam,
    diagnosis: input.diagnosis.trim(),
    clinical_analysis: input.clinicalAnalysis.trim(),
    treatment_plan: finalTreatment,
    recommendations: input.recommendations.trim(),
    warning_signs: input.warningSigns.trim(),
    lab_orders: input.labOrders ?? [],
    imaging_orders: input.imagingOrders ?? [],
    treatment_template_id: input.treatmentTemplateId || null,
    evolution_status: input.evolutionStatus.trim() || null,
    next_follow_up_date: input.nextFollowUpDate || null,
    follow_up_mode: input.entryMode,
    linked_record_id: input.entryMode === "seguimiento" ? input.linkedRecordId || null : null,
    // --- NUEVOS CAMPOS ---
    consultation_type: input.consultationType || null,
    informant_source: input.informantSource || null,
    informant_reliability: input.informantReliability || null,
    referring_doctor: input.referringDoctor || null,
    review_of_systems: input.reviewOfSystems || null,
    general_condition: input.generalCondition?.trim() || null,
    pain_scale: input.painScale ?? null,
    mean_arterial_pressure: input.meanArterialPressure || null,
    current_medications: input.currentMedications ?? [],
    soap: {
      subjective: input.soapSubjective?.trim() || null,
      objective: input.soapObjective?.trim() || null,
      assessment: input.soapAssessment?.trim() || null,
      plan: input.soapPlan?.trim() || null,
    },
    prognosis: {
      vital: input.prognosisVital || null,
      functional: input.prognosisFunctional || null,
    },
    pediatric_data: input.pediatricData?.headCircumference ? input.pediatricData : null,
    blood_type: input.bloodType || null,
    emergency_contact: input.emergencyContact?.name ? input.emergencyContact : null,
    medical_orders: (input.medicalOrders?.diet_type || input.medicalOrders?.general_measures || input.medicalOrders?.nursing_cares)
      ? input.medicalOrders
      : null,
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