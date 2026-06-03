import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

interface PatientSearchResult {
  id: string;
  full_name: string;
  document_number: string;
}

/**
 * Search for a patient by their identification (document_number).
 * Used by lab/imaging/surgery roles who cannot access the full patients table.
 * 
 * Uses the `search_patient_by_identification` RPC function which:
 * - Returns ONLY id, full_name, document_number (no clinical data)
 * - Enforces role check server-side (only lab/imaging/surgery can call it)
 * - Filters by the caller's organization automatically
 */
export function usePatientSearchByIdentification(identification: string) {
  return useQuery({
    queryKey: ["patient-search-identification", identification],
    queryFn: async () => {
      const supabase = getSupabaseClient();

      const { data, error } = await (supabase as any)
        .rpc("search_patient_by_identification", {
          p_identification: identification,
        });

      if (error) throw error;
      return (data ?? []) as unknown as PatientSearchResult[];
    },
    enabled: !!identification && identification.length >= 3,
    // Don't auto-refetch — only search on demand
    staleTime: 30_000,
  });
}
