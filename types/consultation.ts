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

export type ConsultationFormState = {
  patient_id: string;
  chief_complaint: string;
  cie_codes: string;
  specialty_kind: SpecialtyKind;
};

export type MedicineGeneralFields = {
  motivo_consulta: string;
  plan: string;
};

export type PediatriaFields = {
  edad_meses: string;
  peso_kg: string;
  talla_cm: string;
  percentil: string;
};

export type OdontologiaFields = {
  piezas_json: string;
};

export type SpecialtyFormState =
  | ({ specialty_kind: "medicina-general" } & MedicineGeneralFields)
  | ({ specialty_kind: "pediatria" } & PediatriaFields)
  | ({ specialty_kind: "odontologia" } & OdontologiaFields);
