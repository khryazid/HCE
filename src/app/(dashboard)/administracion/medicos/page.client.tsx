"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { useMedicsStats } from "@/features/clinic-admin/lib/use-clinic-admin";

export function MedicosClient() {
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

  return <MedicosDashboard clinicId={tenant.clinic_id} />;
}

function MedicosDashboard({ clinicId }: { clinicId: string }) {
  const { data: doctors, isLoading } = useMedicsStats(clinicId);

  if (isLoading) return <DashboardSkeleton />;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Estadísticas por Médico</h1>
        <p className="text-sm text-ink-soft mt-1">
          Consultas, citas e ingresos de cada médico este mes
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-ink-soft">Médico</th>
              <th className="px-4 py-3 text-left font-medium text-ink-soft">Especialidad</th>
              <th className="px-4 py-3 text-right font-medium text-ink-soft">Consultas</th>
              <th className="px-4 py-3 text-right font-medium text-ink-soft">Citas (mes)</th>
              <th className="px-4 py-3 text-right font-medium text-ink-soft">Ingresos (mes)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {(doctors ?? []).map((doc) => (
              <tr key={doc.doctor_id} className="bg-white dark:bg-gray-900">
                <td className="px-4 py-3 font-medium text-ink">{doc.full_name}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {doc.specialty.length > 0 ? doc.specialty.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {doc.consultation_count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {doc.appointment_count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-medium text-emerald-600 tabular-nums">
                  {formatCurrency(doc.monthly_income)}
                </td>
              </tr>
            ))}
            {(!doctors || doctors.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No hay médicos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
