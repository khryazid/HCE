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



/**
 * Fetch clinic-wide statistics.
 * S-05: Only available for clinic_admin and owner roles.
 */
export function useClinicStats(clinicId: string, options?: { role?: string }) {
  const allowedRoles = ["clinic_admin", "owner"];
  const isAuthorized = !options?.role || allowedRoles.includes(options.role);

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
    enabled: !!clinicId && isAuthorized,
  });
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SUB-ROUTE HOOKS
// ═══════════════════════════════════════════════════════════════

export type SectionType = "doctor" | "lab" | "imaging" | "surgery";

interface SectionFinance {
  section_type: SectionType;
  total_income: number;
  total_expense: number;
  net: number;
  transaction_count: number;
}

/**
 * Fetch financial summary grouped by section_type.
 * Used by /administracion/finanzas.
 */
export function useFinancesBySection(clinicId: string, options?: { role?: string }) {
  const allowedRoles = ["clinic_admin", "owner"];
  const isAuthorized = !options?.role || allowedRoles.includes(options.role);

  return useQuery({
    queryKey: ["admin-finances-by-section", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();

      const { data, error } = await (supabase as any)
        .from("cash_transactions")
        .select("section_type, type, amount, status")
        .eq("clinic_id", clinicId)
        .eq("status", "completed")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (error) throw error;

      const sections: Record<string, SectionFinance> = {};
      const allSections: SectionType[] = ["doctor", "lab", "imaging", "surgery"];
      allSections.forEach((s) => {
        sections[s] = { section_type: s, total_income: 0, total_expense: 0, net: 0, transaction_count: 0 };
      });

      (data ?? []).forEach((tx: any) => {
        const s = tx.section_type || "doctor";
        if (!sections[s]) return;
        sections[s].transaction_count++;
        const amount = Number(tx.amount) || 0;
        if (tx.type === "income") {
          sections[s].total_income += amount;
        } else {
          sections[s].total_expense += amount;
        }
        sections[s].net = sections[s].total_income - sections[s].total_expense;
      });

      return Object.values(sections);
    },
    enabled: !!clinicId && isAuthorized,
  });
}

interface DoctorStats {
  doctor_id: string;
  full_name: string;
  specialty: string[];
  consultation_count: number;
  appointment_count: number;
  monthly_income: number;
}

/**
 * Fetch per-doctor statistics.
 * Used by /administracion/medicos.
 */
export function useMedicsStats(clinicId: string, options?: { role?: string }) {
  const allowedRoles = ["clinic_admin", "owner"];
  const isAuthorized = !options?.role || allowedRoles.includes(options.role);

  return useQuery({
    queryKey: ["admin-medics-stats", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();

      // Get doctor members
      const { data: members } = await supabase
        .from("clinic_members")
        .select("doctor_id, role")
        .eq("clinic_id", clinicId)
        .in("role", ["owner", "doctor"])
        .eq("is_active", true);

      if (!members || members.length === 0) return [];

      const doctorIds = members.map((m) => m.doctor_id);

      // Profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("doctor_id, full_name, specialty")
        .in("doctor_id", doctorIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.doctor_id, p])
      );

      // Consultation counts
      const { data: records } = await supabase
        .from("clinical_records")
        .select("doctor_id")
        .eq("clinic_id", clinicId)
        .in("doctor_id", doctorIds);

      const consultCounts: Record<string, number> = {};
      (records ?? []).forEach((r) => {
        consultCounts[r.doctor_id] = (consultCounts[r.doctor_id] || 0) + 1;
      });

      // Appointment counts (this month)
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: appointments } = await supabase
        .from("appointments")
        .select("doctor_id")
        .eq("clinic_id", clinicId)
        .in("doctor_id", doctorIds)
        .gte("start_time", monthStart);

      const apptCounts: Record<string, number> = {};
      (appointments ?? []).forEach((a) => {
        apptCounts[a.doctor_id] = (apptCounts[a.doctor_id] || 0) + 1;
      });

      // Income this month (section_type = 'doctor')
      const { data: transactions } = await (supabase as any)
        .from("cash_transactions")
        .select("user_id, amount, type")
        .eq("clinic_id", clinicId)
        .eq("section_type", "doctor")
        .eq("status", "completed")
        .eq("type", "income")
        .gte("created_at", monthStart);

      const incomeCounts: Record<string, number> = {};
      (transactions ?? []).forEach((tx: any) => {
        incomeCounts[tx.user_id] = (incomeCounts[tx.user_id] || 0) + Number(tx.amount);
      });

      return doctorIds.map((docId): DoctorStats => {
        const profile = profileMap.get(docId);
        return {
          doctor_id: docId,
          full_name: profile?.full_name ?? "Desconocido",
          specialty: profile?.specialty ?? [],
          consultation_count: consultCounts[docId] || 0,
          appointment_count: apptCounts[docId] || 0,
          monthly_income: incomeCounts[docId] || 0,
        };
      });
    },
    enabled: !!clinicId && isAuthorized,
  });
}

interface DepartmentStats {
  department_type: SectionType;
  orders_pending: number;
  orders_in_progress: number;
  orders_done: number;
  total_income: number;
  total_expense: number;
}

/**
 * Fetch statistics for a specific department.
 * Used by /administracion/laboratorio, /imagen, /cirugia.
 */
export function useSectionStats(
  clinicId: string,
  sectionType: "lab" | "imaging" | "surgery",
  options?: { role?: string }
) {
  const allowedRoles = ["clinic_admin", "owner"];
  const isAuthorized = !options?.role || allowedRoles.includes(options.role);

  return useQuery({
    queryKey: ["admin-section-stats", clinicId, sectionType],
    queryFn: async () => {
      const supabase = getSupabaseClient();

      // Department orders by status
      const { data: orders } = await supabase
        .from("department_orders")
        .select("status")
        .eq("organization_id", clinicId)
        .eq("department_type", sectionType);

      const statusCounts = { pending: 0, in_progress: 0, done: 0 };
      (orders ?? []).forEach((o) => {
        if (o.status in statusCounts) {
          statusCounts[o.status as keyof typeof statusCounts]++;
        }
      });

      // Financial summary for this section
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: transactions } = await (supabase as any)
        .from("cash_transactions")
        .select("type, amount")
        .eq("clinic_id", clinicId)
        .eq("section_type", sectionType)
        .eq("status", "completed")
        .gte("created_at", monthStart);

      let totalIncome = 0;
      let totalExpense = 0;
      (transactions ?? []).forEach((tx: any) => {
        const amount = Number(tx.amount) || 0;
        if (tx.type === "income") totalIncome += amount;
        else totalExpense += amount;
      });

      return {
        department_type: sectionType,
        orders_pending: statusCounts.pending,
        orders_in_progress: statusCounts.in_progress,
        orders_done: statusCounts.done,
        total_income: totalIncome,
        total_expense: totalExpense,
      } as DepartmentStats;
    },
    enabled: !!clinicId && isAuthorized,
  });
}

/**
 * Fetch team list with pending invitations.
 * Used by /administracion/equipo.
 */
export function useTeamList(clinicId: string, options?: { role?: string }) {
  const allowedRoles = ["clinic_admin", "owner"];
  const isAuthorized = !options?.role || allowedRoles.includes(options.role);

  return useQuery({
    queryKey: ["admin-team", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();

      // Active members
      const { data: members } = await supabase
        .from("clinic_members")
        .select("id, doctor_id, role, is_active, created_at, custom_permissions")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true });

      const doctorIds = (members ?? []).map((m) => m.doctor_id);
      const { data: profiles } = doctorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("doctor_id, full_name, specialty")
            .in("doctor_id", doctorIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.doctor_id, p])
      );

      const enrichedMembers = (members ?? []).map((m) => ({
        ...m,
        profile: profileMap.get(m.doctor_id) ?? { full_name: "Desconocido", specialty: [] },
      }));

      // Pending invitations
      const { data: invitations } = await (supabase as any)
        .from("invitations")
        .select("id, email, role, status, expires_at, created_at")
        .eq("organization_id", clinicId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      return {
        members: enrichedMembers,
        pendingInvitations: invitations ?? [],
      };
    },
    enabled: !!clinicId && isAuthorized,
  });
}
