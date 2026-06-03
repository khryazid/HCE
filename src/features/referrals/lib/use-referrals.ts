import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TYPES — New referral model (table: referrals)
// ═══════════════════════════════════════════════════════════════

type ReferralStatus = "pending" | "viewed" | "responded";
type DepartmentType = "lab" | "imaging" | "surgery";

export interface Referral {
  id: string;
  organization_id: string;
  from_member_id: string;
  to_member_id: string | null;
  to_department: DepartmentType | null;
  patient_id: string;
  consultation_id: string | null;
  note: string | null;
  include_full_history: boolean;
  status: ReferralStatus;
  response_note: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface ReferralWithRelations extends Referral {
  patients: { full_name: string; document_number: string } | null;
  from_member: { id: string; profiles: { full_name: string } | null } | null;
  to_member: { id: string; profiles: { full_name: string } | null } | null;
}

export interface CreateReferralInput {
  organization_id: string;
  from_member_id: string;
  to_member_id?: string | null;
  to_department?: DepartmentType | null;
  patient_id: string;
  consultation_id?: string | null;
  note?: string;
  include_full_history?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY — Keep useMedicalReferrals for backward compat
// ═══════════════════════════════════════════════════════════════

// Re-export legacy types for existing imports
export type { MedicalReferral, MedicalReferralInsert } from "../types";

/**
 * @deprecated Use useReferrals instead. This reads from the legacy
 * `medical_referrals` table for backward compatibility.
 */
export function useMedicalReferrals(
  clinicId: string,
  type: "sent" | "received",
  options?: { planType?: "individual" | "clinica" }
) {
  const isClinicPlan = options?.planType === "clinica";

  return useQuery({
    queryKey: ["referrals-legacy", clinicId, type],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      let query = (supabase as any)
        .from("medical_referrals")
        .select(`
          *,
          patients (
            full_name,
            document_number
          ),
          referring:referring_doctor_id (
            full_name
          ),
          referred:referred_doctor_id (
            full_name
          )
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (type === "sent") {
        query = query.eq("referring_doctor_id", session?.user.id);
      } else {
        query = query.eq("referred_doctor_id", session?.user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as any[];
    },
    enabled: !!clinicId && isClinicPlan,
  });
}

// ═══════════════════════════════════════════════════════════════
// NEW MODEL — Referrals (table: referrals)
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch referrals from the new `referrals` table.
 * Plan Clínica only — enabled check is done via planType param.
 * 
 * @param organizationId - The clinic/org ID
 * @param memberId - The current user's member_id in clinic_members
 * @param filter - 'sent' | 'received' | 'department'
 * @param planType - Must be 'clinica' for queries to run
 */
export function useReferrals(
  organizationId: string,
  memberId: string | undefined,
  filter: "sent" | "received" | "department",
  planType?: "individual" | "clinica"
) {
  const isClinicPlan = planType === "clinica";

  return useQuery({
    queryKey: ["referrals", organizationId, memberId, filter],
    queryFn: async () => {
      const supabase = getSupabaseClient();

      // Build join query — the `referrals` table uses clinic_members references
      let query = (supabase as any)
        .from("referrals")
        .select(`
          *,
          patients (
            full_name,
            document_number
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (filter === "sent") {
        query = query.eq("from_member_id", memberId);
      } else if (filter === "received") {
        query = query.eq("to_member_id", memberId);
      }
      // "department" filter relies on RLS — the department user only sees
      // referrals where to_department matches their role

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ReferralWithRelations[];
    },
    enabled: !!organizationId && !!memberId && isClinicPlan,
  });
}

/**
 * Create a new referral.
 * If to_department is set, the SQL trigger `auto_create_department_order`
 * automatically creates a pending department_order.
 */
export function useCreateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReferralInput) => {
      const supabase = getSupabaseClient();

      const { data, error } = await (supabase as any)
        .from("referrals")
        .insert({
          organization_id: input.organization_id,
          from_member_id: input.from_member_id,
          to_member_id: input.to_member_id ?? null,
          to_department: input.to_department ?? null,
          patient_id: input.patient_id,
          consultation_id: input.consultation_id ?? null,
          note: input.note ?? null,
          include_full_history: input.include_full_history ?? false,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Referral;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["referrals", variables.organization_id],
      });
      // Also invalidate department orders since trigger may have created one
      if (variables.to_department) {
        queryClient.invalidateQueries({
          queryKey: ["department-orders", variables.organization_id],
        });
      }
    },
  });
}

/**
 * Mark a referral as viewed.
 * Only changes status from 'pending' → 'viewed'.
 */
export function useMarkReferralViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referralId: string) => {
      const supabase = getSupabaseClient();

      const { data, error } = await (supabase as any)
        .from("referrals")
        .update({ status: "viewed" })
        .eq("id", referralId)
        .eq("status", "pending") // Only change if still pending
        .select()
        .single();

      if (error) throw error;
      return data as Referral;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
    },
  });
}

/**
 * Respond to a referral with a note.
 * Changes status to 'responded' and sets responded_at.
 */
export function useRespondToReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      referralId,
      responseNote,
    }: {
      referralId: string;
      responseNote: string;
    }) => {
      const supabase = getSupabaseClient();

      const { data, error } = await (supabase as any)
        .from("referrals")
        .update({
          status: "responded",
          response_note: responseNote,
          responded_at: new Date().toISOString(),
        })
        .eq("id", referralId)
        .select()
        .single();

      if (error) throw error;
      return data as Referral;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// LEGACY COMPAT — Keep old mutation exports
// ═══════════════════════════════════════════════════════════════

/**
 * @deprecated Use useRespondToReferral instead.
 */
export function useUpdateReferralStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = getSupabaseClient();

      const { data, error } = await (supabase as any)
        .from("medical_referrals")
        .update({ status } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["referrals-legacy"] });
    },
  });
}
