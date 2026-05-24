/**
 * use-patients-realtime.ts — Sync-3.4
 *
 * Supabase Realtime subscription for the patients table.
 * On any INSERT / UPDATE / DELETE from any device/session in the same clinic,
 * this hook refreshes the local IndexedDB mirror and invalidates React Query —
 * so the UI updates **without a page reload**.
 *
 * Sync-3.1: Emite APP_EVENT_REALTIME_DISCONNECTED / RECONNECTED según el estado
 * del canal, para que el SyncStatusBanner muestre el indicador visual.
 * Sync-3.4: usa realtimeChannelManager para no duplicar canales en re-mounts.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { savePatientLocal, deletePatientLocal } from "@/lib/db/indexeddb";
import type { PatientRecord } from "@/features/patients/types";
import type { TenantProfile } from "@/lib/supabase/profile";
import { patientKeys } from "./use-patients-queries";
import {
  APP_EVENT_REALTIME_DISCONNECTED,
  APP_EVENT_REALTIME_RECONNECTED,
  emitAppEvent,
} from "@/lib/observability/app-events";
import { realtimeChannelManager } from "@/lib/supabase/realtime-channel-manager";

export function usePatientsRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id) return;

    const clinicId = tenant.clinic_id;
    const key = `patients:clinic:${clinicId}`;

    realtimeChannelManager.acquire(key, (ch) =>
      ch
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "patients",
            filter: `clinic_id=eq.${clinicId}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (payload.new) {
                await savePatientLocal(payload.new as PatientRecord);
              }
            } else if (payload.eventType === 'DELETE') {
              if (payload.old?.id) {
                await deletePatientLocal(payload.old.id);
              }
            }
            queryClient.invalidateQueries({ queryKey: patientKeys.tenant(clinicId) });
          },
        )
        .subscribe((status) => {
          // Sync-3.1: propagar estado del canal al SyncStatusBanner via eventos
          if (status === "SUBSCRIBED") {
            emitAppEvent(APP_EVENT_REALTIME_RECONNECTED, { channel: "patients" });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            emitAppEvent(APP_EVENT_REALTIME_DISCONNECTED, { channel: "patients", status });
          }
        }),
    );

    return () => {
      realtimeChannelManager.release(key);
    };
  }, [tenant?.clinic_id, queryClient]);
}
