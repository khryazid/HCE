import type { OrgRole } from "@/lib/supabase/profile";

export interface ClinicMemberProfile {
  id: string; // member record id
  clinic_id: string;
  doctor_id: string;
  role: OrgRole;
  created_at: string;
  doctor_profile: {
    full_name: string;
    specialties: string[];
    is_active: boolean;
  };
}

export interface ClinicStats {
  totalPatients: number;
  totalConsultations: number;
  activeDoctors: number;
  monthlyIncome: number;
  topDoctors: { doctor_id: string; count: number }[];
  topSpecialties: { specialty: string; count: number }[];
}
