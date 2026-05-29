import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CashTransaction, CashTransactionInsert, CashShift, CashShiftInsert } from "../types";

export function useCashTransactions(clinicId: string) {
  return useQuery({
    queryKey: ["cash-flow", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("cash_transactions")
        .select(`
          *,
          patients (
            full_name
          ),
          profiles:user_id (
            full_name
          )
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (CashTransaction & {
        patients: { full_name: string } | null;
        profiles: { full_name: string } | null;
      })[];
    },
    enabled: !!clinicId,
  });
}

export function useCurrentCashShift(clinicId: string, userId: string) {
  return useQuery({
    queryKey: ["cash-shift", clinicId, userId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("cash_shifts")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("user_id", userId)
        .eq("status", "open")
        .maybeSingle();

      if (error) throw error;
      return data as CashShift | null;
    },
    enabled: !!clinicId && !!userId,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: CashTransactionInsert) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("cash_transactions")
        .insert(transaction as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow", variables.clinic_id] });
    },
  });
}

export function useVoidTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("cash_transactions")
        .update({ status: "voided" } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
    },
  });
}

export function useOpenShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: CashShiftInsert) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("cash_shifts")
        .insert(shift as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cash-shift", variables.clinic_id, variables.user_id] });
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, finalAmount, clinicId, userId }: { id: string, finalAmount: number, clinicId: string, userId: string }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("cash_shifts")
        .update({ status: "closed", closed_at: new Date().toISOString(), final_amount: finalAmount } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cash-shift", variables.clinicId, variables.userId] });
    },
  });
}
