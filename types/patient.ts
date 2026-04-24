export type PatientRecord = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  document_number: string;
  full_name: string;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientFormValues = {
  document_number: string;
  full_name: string;
  birth_date: string;
};
