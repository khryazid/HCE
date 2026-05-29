import { useQuery } from "@tanstack/react-query";
import { listTreatmentTemplates } from "@/features/consultations/lib/treatments";
import type { TenantProfile } from "@/lib/supabase/profile";

export const templateKeys = {
  all: ["templates"] as const,
  tenant: (clinicId: string) => ["templates", clinicId] as const,
  formTemplates: (clinicId: string) => ["clinical_form_templates", clinicId] as const,
};

export function useTemplates(tenant: TenantProfile | null) {
  return useQuery({
    queryKey: templateKeys.tenant(tenant?.clinic_id ?? ""),
    // listTreatmentTemplates is async (Supabase call)
    queryFn: () => listTreatmentTemplates(tenant!.doctor_id, tenant!.clinic_id),
    enabled: !!tenant,
    // Templates change infrequently — cache for 5 min to avoid refetch on every mount
    staleTime: 5 * 60 * 1000,
  });
}

export function useClinicalFormTemplates(tenant: TenantProfile | null) {
  return useQuery({
    queryKey: templateKeys.formTemplates(tenant?.clinic_id ?? ""),
    queryFn: async () => {
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clinical_form_templates")
        .select("*")
        .eq("clinic_id", tenant!.clinic_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenant,
    staleTime: 5 * 60 * 1000,
  });
}
