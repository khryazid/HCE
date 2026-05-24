import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/supabase/tenant-context";
import type { Json } from "@/types/supabase.types";

export function usePatientReadAudit(patientId: string | null) {
  const { tenant } = useTenant();

  useEffect(() => {
    if (!patientId || !tenant) return;

    // We do not await this, it's a fire-and-forget audit log.
    const logRead = async () => {
      const supabase = getSupabaseClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.rpc("log_audit_event", {
          p_clinic_id: tenant.clinic_id,
          p_doctor_id: user.id,
          p_event_type: "read",
          p_resource_type: "patients",
          p_resource_id: patientId,
          p_changes: { source: "patient_history_view" } as Json,
        });
      } catch (err) {
        // Silently ignore audit log errors to not interrupt the UI flow,
        // but log to console in dev mode.
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to log patient read:", err);
        }
      }
    };

    void logRead();
  }, [patientId, tenant]);
}
