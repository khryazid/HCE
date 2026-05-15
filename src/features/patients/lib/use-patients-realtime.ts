/**
 * use-patients-realtime.ts
 *
 * Supabase Realtime subscription for the patients table.
 * On any INSERT / UPDATE / DELETE from any device/session in the same clinic,
 * this hook refreshes the local IndexedDB mirror and invalidates React Query —
 * so the UI updates **without a page reload**.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { refreshPatientsFromRemote } from "@/lib/db/indexeddb";
import type { TenantProfile } from "@/lib/supabase/profile";
import { patientKeys } from "./use-patients-queries";

export function usePatientsRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id) return;

    const supabase = getSupabaseClient();
    const clinicId = tenant.clinic_id;

    const channel = supabase
      .channel(`patients:clinic:${clinicId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT | UPDATE | DELETE
          schema: "public",
          table: "patients",
          filter: `clinic_id=eq.${clinicId}`,
        },
        async () => {
          // 1. Re-sync local IndexedDB with what's now in Supabase
          await refreshPatientsFromRemote(clinicId);
          // 2. Invalidate React Query so the UI re-renders with fresh data
          queryClient.invalidateQueries({ queryKey: patientKeys.tenant(clinicId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.clinic_id, queryClient]);
}
