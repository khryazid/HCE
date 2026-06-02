import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MedicalReferral, MedicalReferralInsert } from "../types";

/**
 * Fetch medical referrals.
 * Reads from `medical_referrals` (legacy table with full data).
 * The new `referrals` table is written to via dual-write in consultation save
 * and will be the sole source once fully migrated.
 */
export function useMedicalReferrals(clinicId: string, type: "sent" | "received") {
  return useQuery({
    queryKey: ["referrals", clinicId, type],
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
      
      return data as unknown as (MedicalReferral & {
        patients: { full_name: string; document_number: string } | null;
        referring: { full_name: string } | null;
        referred: { full_name: string } | null;
      })[];
    },
    enabled: !!clinicId,
  });
}

function useCreateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referral: MedicalReferralInsert) => {
      const supabase = getSupabaseClient();

      // Insert into legacy table
      const { data, error } = await (supabase as any)
        .from("medical_referrals")
        .insert(referral as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["referrals", variables.clinic_id] });
    },
  });
}

export function useUpdateReferralStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MedicalReferral["status"] }) => {
      const supabase = getSupabaseClient();

      // Update legacy table
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
    },
  });
}
