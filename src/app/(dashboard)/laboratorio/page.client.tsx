"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { LabOrdersView } from "@/features/lab-orders/components/lab-orders-view";

export function LaboratorioPageClient() {
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

  return (
    <div className="p-6">
      <LabOrdersView clinicId={tenant.clinic_id} userId={session.user.id} memberId={tenant.member_id} />
    </div>
  );
}
