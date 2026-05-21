/**
 * use-templates-realtime.ts — Sync-3.4
 *
 * Supabase Realtime for treatment_templates table.
 * When any doctor in the clinic creates/edits/deletes a template,
 * the treatment wizard selector updates without page reload.
 *
 * Sync-3.4: usa realtimeChannelManager para no duplicar canales en re-mounts.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TenantProfile } from "@/lib/supabase/profile";
import { templateKeys } from "./use-consultation-queries";
import { realtimeChannelManager } from "@/lib/supabase/realtime-channel-manager";

export function useTemplatesRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id) return;

    const clinicId = tenant.clinic_id;
    const key = `treatment_templates:clinic:${clinicId}`;

    realtimeChannelManager.acquire(key, (ch) =>
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "treatment_templates",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: templateKeys.tenant(clinicId) });
        },
      ),
    );

    return () => {
      realtimeChannelManager.release(key);
    };
  }, [tenant?.clinic_id, queryClient]);
}
