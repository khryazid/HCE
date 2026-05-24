/**
 * use-clinical-records-realtime.ts — Sync-3.5
 *
 * Supabase Realtime for clinical_records and specialty_data.
 * Triggers a granular update of local IndexedDB and invalidates React Query
 * so the patient history timeline updates without page reload.
 *
 * Sync-3.4: usa realtimeChannelManager para no duplicar canales en re-mounts.
 * Sync-3.5: usa payload granular (INSERT/UPDATE/DELETE) en vez de refetch masivo.
 *           Cada evento solo afecta el registro modificado — sin descarga completa.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  saveClinicalRecordLocal,
  deleteClinicalRecordLocal,
} from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { TenantProfile } from "@/lib/supabase/profile";
import { recordKeys } from "./use-patients-queries";
import { realtimeChannelManager } from "@/lib/supabase/realtime-channel-manager";

export function useClinicalRecordsRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!tenant?.clinic_id || !tenant?.doctor_id) return;

    const { clinic_id, doctor_id } = tenant;
    const key = `clinical_records:doctor:${doctor_id}`;

    realtimeChannelManager.acquire(key, (ch) =>
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinical_records",
          // M-07: Filtrar por doctor_id además de clinic_id.
          filter: `clinic_id=eq.${clinic_id}&doctor_id=eq.${doctor_id}`,
        },
        async (payload) => {
          // Sync-3.5: Aplicar cambio granular en IDB en lugar de refetch completo.
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            if (payload.new) {
              await saveClinicalRecordLocal(payload.new as ClinicalRecordRecord);
            }
          } else if (payload.eventType === "DELETE") {
            if (payload.old?.id) {
              await deleteClinicalRecordLocal(payload.old.id);
            }
          }
          queryClientRef.current.invalidateQueries({ queryKey: recordKeys.tenant(clinic_id) });
        },
      ),
    );

    return () => {
      realtimeChannelManager.release(key);
    };
  // tenant object ref changes on every render; we only care about the IDs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.clinic_id, tenant?.doctor_id]);
}
