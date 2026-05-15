/**
 * use-clinical-records-realtime.ts
 *
 * Supabase Realtime for clinical_records and specialty_data.
 * Triggers a re-sync of local IndexedDB and invalidates React Query
 * so the patient history timeline updates without page reload.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  refreshClinicalRecordsFromRemote,
  refreshSpecialtyDataFromRemote,
} from "@/lib/db/indexeddb";
import type { TenantProfile } from "@/lib/supabase/profile";
import { recordKeys } from "./use-patients-queries";

export function useClinicalRecordsRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id || !tenant?.doctor_id) return;

    const supabase = getSupabaseClient();
    const { clinic_id, doctor_id } = tenant;

    const channel = supabase
      .channel(`clinical_records:clinic:${clinic_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinical_records",
          filter: `clinic_id=eq.${clinic_id}`,
        },
        async () => {
          await refreshClinicalRecordsFromRemote(clinic_id, doctor_id);
          await refreshSpecialtyDataFromRemote(clinic_id, doctor_id);
          queryClient.invalidateQueries({ queryKey: recordKeys.tenant(clinic_id) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // tenant object ref changes on every render; we only care about the IDs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.clinic_id, tenant?.doctor_id, queryClient]);
}
