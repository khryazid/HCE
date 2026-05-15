/**
 * use-agenda-realtime.ts
 *
 * Supabase Realtime subscription for the appointments table.
 * Any INSERT / UPDATE / DELETE from any session (assistant, another device)
 * auto-refreshes the calendar without a page reload.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { TenantProfile } from "@/lib/supabase/profile";

export function useAgendaRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.doctor_id) return;

    const supabase = getSupabaseClient();
    const doctorId = tenant.doctor_id;

    const channel = supabase
      .channel(`appointments:doctor:${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT | UPDATE | DELETE
          schema: "public",
          table: "appointments",
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          // Invalidate React Query → calendar re-renders instantly
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.doctor_id, queryClient]);
}
