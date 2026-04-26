export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          full_name: string;
          specialty: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          full_name: string;
          specialty: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          clinic_id: string;
          doctor_id: string;
          full_name: string;
          specialty: string;
          updated_at: string;
        }>;
      };
      patients: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          document_number: string;
          full_name: string;
          birth_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          document_number: string;
          full_name: string;
          birth_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          clinic_id: string;
          doctor_id: string;
          document_number: string;
          full_name: string;
          birth_date: string | null;
          status: string;
          updated_at: string;
        }>;
      };
      clinical_records: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          patient_id: string;
          chief_complaint: string;
          cie_codes: string[];
          specialty_kind: string;
          specialty_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          patient_id: string;
          chief_complaint: string;
          cie_codes: string[];
          specialty_kind: string;
          specialty_data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          clinic_id: string;
          doctor_id: string;
          patient_id: string;
          chief_complaint: string;
          cie_codes: string[];
          specialty_kind: string;
          specialty_data: Json;
          updated_at: string;
        }>;
      };
      specialty_data: {
        Row: {
          id: string;
          clinic_id: string;
          doctor_id: string;
          clinical_record_id: string;
          specialty_kind: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          doctor_id: string;
          clinical_record_id: string;
          specialty_kind: string;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          clinic_id: string;
          doctor_id: string;
          clinical_record_id: string;
          specialty_kind: string;
          data: Json;
          updated_at: string;
        }>;
      };
    };
  };
};
