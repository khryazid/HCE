import { normalizeCommaValues } from "@/lib/consultations/workflow";

export type ConsultationPdfPreviewData = {
  patientName: string;
  patientDocument: string;
  birthDate?: string;
  consultationDate: string;
  gender: string;
  occupation: string;
  insurance: string;
  chiefComplaint: string;
  anamnesis: string;
  medicalHistory: string;
  backgrounds?: {
    pathological: string;
    surgical: string;
    allergic: string;
    pharmacological: string;
    family: string;
    toxic: string;
    gynecoObstetric: string;
  };
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
  };
  physicalExam: string;
  diagnosis: string;
  cieCodes: string[];
  clinicalAnalysis: string;
  treatmentPlan: string;
  recommendations: string;
  warningSigns: string;
  specialtyKind: string;
  evolutionStatus?: string;
  followUpDate?: string;
};

type ConsultationPdfPreviewInput = Omit<ConsultationPdfPreviewData, "cieCodes"> & {
  cieCodes: string;
};

export function buildConsultationPdfPreviewData(
  input: ConsultationPdfPreviewInput,
): ConsultationPdfPreviewData {
  return {
    ...input,
    cieCodes: normalizeCommaValues(input.cieCodes),
  };
}