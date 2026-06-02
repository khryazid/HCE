import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ClinicMemberProfile, ClinicStats } from "../types";

export function useClinicMembers(clinicId: string) {
  return useQuery({
    queryKey: ["clinic-members", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      const { data: members, error: membersError } = await supabase
        .from("clinic_members")
        .select(`
          id,
          clinic_id,
          doctor_id,
          role,
          created_at
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;
      
      if (!members || members.length === 0) return [];

      const doctorIds = members.map(m => m.doctor_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("doctor_id, full_name, specialty")
        .in("doctor_id", doctorIds);
        
      if (profilesError) throw profilesError;

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.doctor_id, p));

      return members.map(m => ({
        ...m,
        doctor_profile: profileMap.get(m.doctor_id) || {
          full_name: "Usuario Desconocido",
          specialty: []
        }
      })) as unknown as ClinicMemberProfile[];
    },
    enabled: !!clinicId,
  });
}



export function useClinicStats(clinicId: string) {
  return useQuery({
    queryKey: ["clinic-stats", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      const [patientsRes, recordsRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
        supabase.from("clinical_records").select("doctor_id, specialty_kind").eq("clinic_id", clinicId),
      ]);

      const totalPatients = patientsRes.count || 0;
      
      const records = recordsRes.data || [];
      const totalConsultations = records.length;
      
      const doctorCounts: Record<string, number> = {};
      const specialtyCounts: Record<string, number> = {};
      
      records.forEach(r => {
        doctorCounts[r.doctor_id] = (doctorCounts[r.doctor_id] || 0) + 1;
        if (r.specialty_kind) {
          specialtyCounts[r.specialty_kind] = (specialtyCounts[r.specialty_kind] || 0) + 1;
        }
      });
      
      const topDoctors = Object.entries(doctorCounts)
        .map(([doctor_id, count]) => ({ doctor_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
      const topSpecialties = Object.entries(specialtyCounts)
        .map(([specialty, count]) => ({ specialty, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const incomeRes = await (supabase as any).from("cash_transactions")
        .select("amount, user_id, type")
        .eq("clinic_id", clinicId)
        .eq("status", "completed")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const allTxs = incomeRes.data || [];
      const monthlyIncome = allTxs
        .filter((tx: any) => tx.type === "income")
        .reduce((acc: number, tx: any) => acc + Number(tx.amount), 0);

      // Lab Metrics
      const labIncome = { lab: 0, imaging: 0 };
      const labExpense = { lab: 0, imaging: 0 };

      // We need to know the roles of the users
      const { data: memberRoles } = await supabase
        .from("clinic_members")
        .select("doctor_id, role")
        .eq("clinic_id", clinicId);

      const roleMap = new Map();
      memberRoles?.forEach(m => roleMap.set(m.doctor_id, m.role));

      allTxs.forEach((tx: any) => {
        const role = roleMap.get(tx.user_id);
        if (role === "lab") {
          if (tx.type === "income") labIncome.lab += Number(tx.amount);
          if (tx.type === "expense") labExpense.lab += Number(tx.amount);
        } else if (role === "imaging") {
          if (tx.type === "income") labIncome.imaging += Number(tx.amount);
          if (tx.type === "expense") labExpense.imaging += Number(tx.amount);
        }
      });

      return {
        totalPatients,
        totalConsultations,
        monthlyIncome,
        activeDoctors: 0, 
        topDoctors,
        topSpecialties,
        labMetrics: {
          labIncome,
          labExpense
        }
      } as ClinicStats & { labMetrics: any };
    },
    enabled: !!clinicId,
  });
}
