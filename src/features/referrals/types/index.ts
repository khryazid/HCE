type ReferralStatus = "pending" | "accepted" | "completed" | "declined";

export interface MedicalReferral {
  id: string;
  clinic_id: string;
  referring_doctor_id: string;
  referred_doctor_id: string | null;
  external_doctor_name: string | null;
  external_doctor_contact: string | null;
  patient_id: string;
  clinical_record_id: string | null;
  reason: string;
  include_report: boolean;
  status: ReferralStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalReferralInsert {
  clinic_id: string;
  referring_doctor_id: string;
  referred_doctor_id?: string | null;
  external_doctor_name?: string | null;
  external_doctor_contact?: string | null;
  patient_id: string;
  clinical_record_id?: string | null;
  reason: string;
  include_report?: boolean;
  status?: ReferralStatus;
  notes?: string | null;
}
