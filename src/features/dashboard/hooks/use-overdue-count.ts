"use client";

import { useEffect, useState } from "react";
import { listClinicalRecordsByTenant } from "@/lib/db/indexeddb";
import { useTenant } from "@/lib/supabase/tenant-context";
import { type ClinicalRecordRecord } from "@/features/consultations/types";

export function useOverdueCount() {
  const { tenant } = useTenant();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!tenant) return;
    let active = true;

    const load = async () => {
      try {
        const records = await listClinicalRecordsByTenant(
          tenant.doctor_id,
          tenant.clinic_id,
        );
        const now = Date.now();
        const overdue = records.filter((r: ClinicalRecordRecord) => {
          const sd = r.specialty_data as Record<string, unknown>;
          const d = typeof sd.next_follow_up_date === "string"
            ? Date.parse(sd.next_follow_up_date) : NaN;
          return !isNaN(d) && d < now;
        }).length;
        if (active) setCount(overdue);
      } catch (err) {
        console.error("Error loading overdue count", err);
      }
    };

    void load();
    return () => { active = false; };
  }, [tenant]);

  return count;
}
