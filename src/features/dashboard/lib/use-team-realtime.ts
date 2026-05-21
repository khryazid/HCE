/**
 * use-team-realtime.ts — Sync-3.4
 *
 * Supabase Realtime for clinic_members table.
 * When an admin adds/removes/changes a team member from any device,
 * the team panel updates automatically.
 *
 * Sync-3.4: usa realtimeChannelManager para no duplicar canales en re-mounts.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TenantProfile } from "@/lib/supabase/profile";
import { realtimeChannelManager } from "@/lib/supabase/realtime-channel-manager";

export function useTeamRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id) return;

    const clinicId = tenant.clinic_id;
    const key = `clinic_members:clinic:${clinicId}`;

    realtimeChannelManager.acquire(key, (ch) =>
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinic_members",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
        },
      ),
    );

    return () => {
      realtimeChannelManager.release(key);
    };
  }, [tenant?.clinic_id, queryClient]);
}
