"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { AdminSectionDashboard } from "@/features/clinic-admin/components/admin-section-dashboard";

export function CirugiaAdminClient() {
  const { tenant, loading, error } = useTenant();

  if (loading) return <DashboardSkeleton />;
  if (error || !tenant) {
    return (
      <div className="rounded-md bg-red-50 p-4 mt-4" role="alert">
        <p className="text-sm font-medium text-red-800">
          {error || "No se pudo cargar el contexto"}
        </p>
      </div>
    );
  }

  return <AdminSectionDashboard clinicId={tenant.clinic_id} sectionType="surgery" />;
}
