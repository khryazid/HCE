"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { useFinancesBySection } from "@/features/clinic-admin/lib/use-clinic-admin";

export function FinanzasClient() {
  const { tenant, loading, error } = useTenant();

  if (loading) return <DashboardSkeleton />;
  if (error || !tenant) {
    return (
      <div className="rounded-md bg-red-50 p-4 mt-4" role="alert">
        <p className="text-sm font-medium text-red-800">
          {error || "No se pudo cargar el contexto de la clínica"}
        </p>
      </div>
    );
  }

  return <FinanzasDashboard clinicId={tenant.clinic_id} />;
}

function FinanzasDashboard({ clinicId }: { clinicId: string }) {
  const { data: sections, isLoading } = useFinancesBySection(clinicId);

  if (isLoading) return <DashboardSkeleton />;

  const sectionLabels: Record<string, string> = {
    doctor: "Consultas Médicas",
    lab: "Laboratorio",
    imaging: "Imagenología",
    surgery: "Cirugía",
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Finanzas por Sección</h1>
        <p className="text-sm text-ink-soft mt-1">
          Desglose financiero del mes actual por cada sección de la clínica
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(sections ?? []).map((s) => (
          <div
            key={s.section_type}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <h3 className="text-sm font-medium text-ink-soft">
              {sectionLabels[s.section_type] ?? s.section_type}
            </h3>
            <p className="mt-2 text-2xl font-bold text-ink">
              {formatCurrency(s.net)}
            </p>
            <div className="mt-3 flex justify-between text-xs text-ink-soft">
              <span className="text-emerald-600">
                +{formatCurrency(s.total_income)}
              </span>
              <span className="text-red-500">
                -{formatCurrency(s.total_expense)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {s.transaction_count} transacciones
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
