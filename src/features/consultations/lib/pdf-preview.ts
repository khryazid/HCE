import { normalizeCommaValues } from "@/features/consultations/lib/workflow";

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
  physicalExamStructured?: { system: string; content: string }[];
  diagnosis: string;
  cieCodes: string[];
  clinicalAnalysis: string;
  treatmentPlan: string;
  medicationInstructions?: string;
  recommendations: string;
  warningSigns: string;
  labOrders?: string[];
  imagingOrders?: string[];
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