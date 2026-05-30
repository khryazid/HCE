"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { CashFlowView } from "@/features/cash-flow/components/cash-flow-view";
import { AdminCajaView } from "@/features/clinic-admin/components/admin-caja-view";

export function CajaPageClient() {
  const { tenant, loading, error, session } = useTenant();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !tenant || !session) {
    return (
      <div className="rounded-md bg-red-50 p-4 mt-4" role="alert">
        <p className="text-sm font-medium text-red-800">
          {error || "No se pudo cargar el contexto de la clínica"}
        </p>
      </div>
    );
  }

  if ((tenant.role === "clinic_admin") || (tenant.role === "owner" && tenant.plan === "clinic")) {
    return (
      <div className="p-6">
        <AdminCajaView />
      </div>
    );
  }

  return (
    <div className="p-6">
      <CashFlowView clinicId={tenant.clinic_id} userId={session.user.id} tenant={tenant} />
    </div>
  );
}
