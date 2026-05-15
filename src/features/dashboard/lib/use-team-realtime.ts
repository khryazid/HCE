/**
 * use-team-realtime.ts
 *
 * Supabase Realtime for clinic_members table.
 * When an admin adds/removes/changes a team member from any device,
 * the team panel updates automatically.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { TenantProfile } from "@/lib/supabase/profile";

export function useTeamRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id) return;

    const supabase = getSupabaseClient();
    const clinicId = tenant.clinic_id;

    const channel = supabase
      .channel(`clinic_members:clinic:${clinicId}`)
      .on(
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.clinic_id, queryClient]);
}
