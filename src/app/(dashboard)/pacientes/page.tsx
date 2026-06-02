"use client";

import PatientsView from "@/features/patients/components/patients-view";
import { AdminPatientsView } from "@/features/clinic-admin/components/admin-patients-view";
import { useTenant } from "@/lib/supabase/tenant-context";

export default function PacientesPage() {
  const { tenant } = useTenant();
  
  if ((tenant?.role === "clinic_admin") || (tenant?.role === "owner" && tenant?.plan === "clinic")) {
    return <AdminPatientsView />;
  }
  
  return <PatientsView />;
}
