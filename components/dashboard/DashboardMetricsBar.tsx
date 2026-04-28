"use client";

/**
 * components/dashboard/DashboardMetricsBar.tsx
 *
 * Barra de 3 métricas clave del dashboard.
 */

import type { DashboardMetrics } from "@/components/dashboard/types";

type Props = {
  metrics: DashboardMetrics;
};

export function DashboardMetricsBar({ metrics }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="hce-surface p-4 flex flex-col items-center justify-center text-center transition hover:shadow-md">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Pacientes activos
        </h2>
        <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{metrics.activePatients}</p>
      </article>
      <article className="hce-surface p-4 flex flex-col items-center justify-center text-center transition hover:shadow-md">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Seguimientos pendientes
        </h2>
        <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{metrics.followUpPending}</p>
      </article>
      <article
        className={`hce-surface p-4 flex flex-col items-center justify-center text-center transition hover:shadow-md ${
          metrics.incompleteRecords > 0 ? "border-amber-200 bg-amber-50/30" : ""
        }`}
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Registros incompletos
        </h2>
        <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{metrics.incompleteRecords}</p>
      </article>
    </div>
  );
}
