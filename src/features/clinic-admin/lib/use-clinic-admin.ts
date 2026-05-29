import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ClinicMemberProfile, ClinicStats } from "../types";

export function useClinicMembers(clinicId: string) {
  return useQuery({
    queryKey: ["clinic-members", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from("clinic_members")
        .select(`
          id,
          clinic_id,
          doctor_id,
          role,
          created_at,
          doctor_profile:profiles!clinic_members_doctor_id_fkey (
            full_name,
            specialties,
            is_active
          )
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      return data as unknown as ClinicMemberProfile[];
    },
    enabled: !!clinicId,
  });
}

export function useClinicStats(clinicId: string) {
  return useQuery({
    queryKey: ["clinic-stats", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      // We will perform multiple count queries in parallel.
      const [patientsRes, recordsRes, incomeRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
        supabase.from("clinical_records").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
        // Simplification for income: get all completed incomes for the current month
        (supabase as any).from("cash_transactions")
          .select("amount")
          .eq("clinic_id", clinicId)
          .eq("type", "income")
          .eq("status", "completed")
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      const totalPatients = patientsRes.count || 0;
      const totalConsultations = recordsRes.count || 0;
      const monthlyIncome = incomeRes.data?.reduce((acc: number, tx: any) => acc + Number(tx.amount), 0) || 0;

      return {
        totalPatients,
        totalConsultations,
        monthlyIncome,
        activeDoctors: 0, // This will be calculated from the members query below in the component
      } as ClinicStats;
    },
    enabled: !!clinicId,
  });
}
