"use client";

import { useMemo } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useClinicalRecords } from "@/features/patients/lib/use-patients-queries";
import { useClinicalRecordsRealtime } from "@/features/patients/lib/use-clinical-records-realtime";

export function useOverdueCount() {
  const { tenant } = useTenant();
  
  // React Query fetch (cached, auto-invalidated)
  const { data: records = [] } = useClinicalRecords(tenant);
  
  // Realtime subscription (invalidates cache on remote changes)
  useClinicalRecordsRealtime(tenant);

  const count = useMemo(() => {
    if (!tenant || records.length === 0) return 0;
    
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    let overdue = 0;
    
    for (const r of records) {
      const sd = r.specialty_data as Record<string, unknown>;
      const d = typeof sd.next_follow_up_date === "string" 
        ? Date.parse(sd.next_follow_up_date) 
        : NaN;
        
      if (!Number.isNaN(d) && d < now) {
        overdue++;
      }
    }
    
    return overdue;
  }, [records, tenant]);

  return count;
}
