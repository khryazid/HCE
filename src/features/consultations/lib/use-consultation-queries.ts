import { useQuery } from "@tanstack/react-query";
import { listTreatmentTemplates } from "@/features/consultations/lib/treatments";
import type { TenantProfile } from "@/lib/supabase/profile";

export const templateKeys = {
  all: ["templates"] as const,
  tenant: (clinicId: string) => ["templates", clinicId] as const,
};

export function useTemplates(tenant: TenantProfile | null) {
  return useQuery({
    queryKey: templateKeys.tenant(tenant?.clinic_id ?? ""),
    // listTreatmentTemplates is now async (Supabase call)
    queryFn: () => listTreatmentTemplates(tenant!.doctor_id, tenant!.clinic_id),
    enabled: !!tenant,
  });
}
