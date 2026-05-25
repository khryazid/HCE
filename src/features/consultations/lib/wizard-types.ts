import type { MedInstruction } from "@/features/consultations/components/medication-instructions-builder";
import type { WizardPendingFollowUp } from "./wizard-domain";

export type CurrentMedication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  since: string;
};

export type ReviewOfSystemEntry = { present: boolean; notes: string };

export type WizardForm = {
  entryMode: "consulta" | "seguimiento";
  patientId: string;
  linkedRecordId: string;
  specialtyKind: string;
  patientStatus: "activo" | "inactivo" | "en-seguimiento" | "alta";
  appointmentId: string | null;

  gender: "Hombre" | "Mujer" | "";
  occupation: string;
  insurance: string;
  blood_type: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };

  consultationType: "primera-vez" | "control" | "urgencia" | "interconsulta";
  informantSource: "paciente" | "familiar" | "expediente" | "otro";
  informantReliability: "confiable" | "parcialmente-confiable" | "no-confiable";
  referringDoctor: string;

  chiefComplaint: string;
  anamnesis: string;
  symptoms: string;
  medicalHistory: string;
  backgrounds: {
    pathological: string;
    surgical: string;
    allergic: string;
    pharmacological: string;
    family: string;
    toxic: string;
    gynecoObstetric: string;
  };

  reviewOfSystems: {
    cardiovascular: ReviewOfSystemEntry;
    respiratory: ReviewOfSystemEntry;
    gastrointestinal: ReviewOfSystemEntry;
    genitourinary: ReviewOfSystemEntry;
    neurological: ReviewOfSystemEntry;
    musculoskeletal: ReviewOfSystemEntry;
    dermatological: ReviewOfSystemEntry;
    endocrine: ReviewOfSystemEntry;
    psychiatric: ReviewOfSystemEntry;
    hematological: ReviewOfSystemEntry;
  };

  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
    mean_arterial_pressure: string;
  };
  physicalExam: { system: string; content: string }[];
  generalCondition: string;
  painScale: number | null;

  diagnosis: string;
  cieCodes: string;
  clinicalAnalysis: string;

  medical_orders: {
    diet_type: string;
    general_measures: string;
    nursing_cares: string;
  };
  treatmentTemplateId: string;
  treatmentPlan: string;
  medicationInstructions: string;
  recommendations: string;
  warningSigns: string;
  labOrders: string[];
  imagingOrders: string[];

  currentMedications: CurrentMedication[];
  medicationInstructionsStructured: MedInstruction[];

  evolutionStatus: string;
  nextFollowUpDate: string;

  soapSubjective: string;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;

  prognosisVital: "bueno" | "reservado" | "malo" | "";
  prognosisFunctional: "bueno" | "reservado" | "malo" | "";

  pediatricData: {
    headCircumference: string;
    developmentStage: string;
    vaccineStatus: string;
  };
};

export type QuickPatientForm = {
  documentNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
};

export type PendingFollowUp = WizardPendingFollowUp;
