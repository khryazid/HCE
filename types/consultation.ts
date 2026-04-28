import type { SpecialtyData, SpecialtyKind } from "@/types/clinical";

export type ClinicalRecordRecord = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  chief_complaint: string;
  cie_codes: string[];
  specialty_kind: SpecialtyKind;
  specialty_data: SpecialtyData | Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SpecialtyDataRow = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  clinical_record_id: string;
  specialty_kind: SpecialtyKind;
  data: SpecialtyData | Record<string, unknown>;
  created_at: string;
  updated_at: string;
};


