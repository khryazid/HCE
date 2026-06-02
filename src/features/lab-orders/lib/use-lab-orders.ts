import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { LabOrder, LabOrderInsert, LabOrderUpdate } from "../types";

export function useLabOrders(clinicId: string) {
  return useQuery({
    queryKey: ["lab-orders", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("lab_orders")
        .select(`
          *,
          patients (
            full_name,
            document_number,
            phone
          ),
          profiles:doctor_id (
            full_name
          )
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as (LabOrder & {
        patients: { full_name: string; document_number: string; phone: string | null } | null;
        profiles: { full_name: string } | null;
      })[];
    },
    enabled: !!clinicId,
  });
}

export function useCreateLabOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: LabOrderInsert) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("lab_orders")
        .insert(order as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lab-orders", variables.clinic_id] });
    },
  });
}

export function useUpdateLabOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LabOrderUpdate }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("lab_orders")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
    },
  });
}
