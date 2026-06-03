import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

export type DepartmentType = "lab" | "imaging" | "surgery";
type OrderStatus = "pending" | "in_progress" | "done";

export interface DepartmentOrder {
  id: string;
  organization_id: string;
  department_type: DepartmentType;
  patient_id: string;
  ordered_by_member_id: string;
  referral_id: string | null;
  status: OrderStatus;
  title: string | null;
  notes: string | null;
  result_notes: string | null;
  completed_by_member_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface DepartmentOrderWithRelations extends DepartmentOrder {
  patients: { full_name: string; document_number: string } | null;
  ordered_by: { id: string; role: string; profiles: { full_name: string } | null } | null;
}

/**
 * Fetch department orders for a specific department type within an organization.
 * Used by /imagen and /cirugia dashboards.
 */
export function useDepartmentOrders(organizationId: string, departmentType: DepartmentType) {
  return useQuery({
    queryKey: ["department-orders", organizationId, departmentType],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("department_orders")
        .select(`
          *,
          patients (
            full_name,
            document_number
          )
        `)
        .eq("organization_id", organizationId)
        .eq("department_type", departmentType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as DepartmentOrderWithRelations[];
    },
    enabled: !!organizationId,
  });
}

/**
 * Count orders by status for stats cards.
 */
export function useDepartmentOrderStats(organizationId: string, departmentType: DepartmentType) {
  const { data: orders } = useDepartmentOrders(organizationId, departmentType);

  const pending = orders?.filter((o) => o.status === "pending").length ?? 0;
  const inProgress = orders?.filter((o) => o.status === "in_progress").length ?? 0;
  const done = orders?.filter((o) => o.status === "done").length ?? 0;

  return { pending, inProgress, done, total: pending + inProgress + done };
}

/**
 * Update a department order (status, result_notes, etc.)
 */
export function useUpdateDepartmentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<DepartmentOrder, "status" | "result_notes" | "completed_at" | "completed_by_member_id">>;
    }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("department_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-orders"] });
    },
  });
}

/**
 * Add results to a department order and mark it as done.
 * Used by lab/imaging/surgery to submit completed results.
 */
export function useAddOrderResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      resultNotes,
      completedByMemberId,
    }: {
      orderId: string;
      resultNotes: string;
      completedByMemberId: string;
    }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("department_orders")
        .update({
          result_notes: resultNotes,
          status: "done",
          completed_by_member_id: completedByMemberId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-orders"] });
    },
  });
}

/**
 * Mark an order as in_progress.
 * Used when a department starts working on an order.
 */
export function useStartOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("department_orders")
        .update({ status: "in_progress" })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-orders"] });
    },
  });
}

/**
 * Helper: get department type from user role.
 */
export function getDepartmentTypeFromRole(role: string): DepartmentType | null {
  const map: Record<string, DepartmentType> = {
    lab: "lab",
    imaging: "imaging",
    surgery: "surgery",
  };
  return map[role] ?? null;
}
