import type { jsPDF } from "jspdf";
import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";

export type ConsultationPdfData = {
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
  generalCondition?: string;
  painScale?: number | null;
  reviewOfSystems?: Record<string, { present: boolean; notes: string }>;
  soapSubjective?: string;
  soapObjective?: string;
  soapAssessment?: string;
  soapPlan?: string;
  prognosisVital?: string;
  prognosisFunctional?: string;
};

export interface PdfContext {
  doc: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  letterhead: LetterheadSettings;
  data: ConsultationPdfData;
}
