/**
 * use-templates-realtime.ts
 *
 * Supabase Realtime for treatment_templates table.
 * When any doctor in the clinic creates/edits/deletes a template,
 * the treatment wizard selector updates without page reload.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { TenantProfile } from "@/lib/supabase/profile";
import { templateKeys } from "./use-consultation-queries";

export function useTemplatesRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id) return;

    const supabase = getSupabaseClient();
    const clinicId = tenant.clinic_id;

    const channel = supabase
      .channel(`treatment_templates:clinic:${clinicId}`)
      .on(
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.clinic_id, queryClient]);
}
