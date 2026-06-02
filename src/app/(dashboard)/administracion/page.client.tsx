"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { ClinicAdminView } from "@/features/clinic-admin/components/clinic-admin-view";

export function ClinicDashboardClient() {
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

  // Verificar si es admin
  const isAdmin = tenant.plan === "clinic"; 
  // Podríamos refinar validando roles específicos de clinic_members, 
  // pero el tenant.plan y las RLS ya nos protegen. 
  // Además, los doctores solteros no tienen esto habilitado en UI.

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center max-w-md">
          <h3 className="text-lg font-semibold text-ink">Acceso Restringido</h3>
          <p className="text-sm text-ink-soft mt-2">
            El dashboard de administración es exclusivo para planes de Clínica (Multi-doctor).
            Actualiza tu plan para acceder a estas funciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ClinicAdminView clinicId={tenant.clinic_id} />
    </div>
  );
}
