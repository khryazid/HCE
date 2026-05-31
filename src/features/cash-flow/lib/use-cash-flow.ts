import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CashTransaction, CashTransactionInsert, CashShift, CashShiftInsert } from "../types";

export function useCashTransactions(clinicId: string, startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["cash-flow", clinicId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      let query = (supabase as any)
        .from("cash_transactions")
        .select(`
          *,
          patients (
            full_name
          )
        `)
        .eq("clinic_id", clinicId);

      if (startDate && endDate) {
        query = query.gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as (CashTransaction & {
        patients: { full_name: string } | null;
      })[];
    },
    enabled: !!clinicId,
  });
}

export function useCurrentCashShift(clinicId: string) {
  return useQuery({
    queryKey: ["cash-shift", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("cash_shifts")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CashShift | null;
    },
    enabled: !!clinicId,
  });
}

export function useAppointmentsMetrics(clinicId: string, doctorId: string, startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["appointments-metrics", clinicId, doctorId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      let query = (supabase as any)
        .from("appointments")
        .select("payment_status, payment_method, amount, status")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", doctorId)
        .eq("status", "completed");

      if (startDate && endDate) {
        query = query.gte("updated_at", startDate.toISOString()).lte("updated_at", endDate.toISOString());
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("updated_at", today.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as { payment_status: string | null, payment_method: string | null, amount: number | null }[];
    },
    enabled: !!clinicId && !!doctorId,
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
      queryClient.invalidateQueries({ queryKey: ["cash-shift", variables.clinic_id] });
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
      queryClient.invalidateQueries({ queryKey: ["cash-shift", variables.clinicId] });
    },
  });
}
