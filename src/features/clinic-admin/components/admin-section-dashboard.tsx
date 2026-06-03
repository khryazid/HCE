"use client";

import { DashboardSkeleton } from "@/components/ui/skeletons";
import { useSectionStats } from "@/features/clinic-admin/lib/use-clinic-admin";

const SECTION_LABELS: Record<string, string> = {
  lab: "Laboratorio",
  imaging: "Imagenología",
  surgery: "Cirugía",
};

interface Props {
  clinicId: string;
  sectionType: "lab" | "imaging" | "surgery";
}

export function AdminSectionDashboard({ clinicId, sectionType }: Props) {
  const { data: stats, isLoading } = useSectionStats(clinicId, sectionType);

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  const label = SECTION_LABELS[sectionType] ?? sectionType;
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          Administración — {label}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Órdenes y finanzas de la sección de {label.toLowerCase()}
        </p>
      </div>

      {/* Order Status Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pendientes</p>
          <p className="mt-1 text-3xl font-bold text-amber-800 dark:text-amber-200 tabular-nums">
            {stats.orders_pending}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-900/20">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">En Progreso</p>
          <p className="mt-1 text-3xl font-bold text-sky-800 dark:text-sky-200 tabular-nums">
            {stats.orders_in_progress}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Completadas</p>
          <p className="mt-1 text-3xl font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
            {stats.orders_done}
          </p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-ink mb-4">Finanzas del Mes</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-ink-soft">Ingresos</p>
            <p className="text-xl font-bold text-emerald-600 tabular-nums">
              {formatCurrency(stats.total_income)}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-soft">Gastos</p>
            <p className="text-xl font-bold text-red-500 tabular-nums">
              {formatCurrency(stats.total_expense)}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-soft">Neto</p>
            <p className="text-xl font-bold text-ink tabular-nums">
              {formatCurrency(stats.total_income - stats.total_expense)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
