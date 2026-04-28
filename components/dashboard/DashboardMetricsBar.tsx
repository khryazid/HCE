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
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 text-ink-soft">
          {metrics.incompleteRecords > 0 && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          Registros incompletos
        </h2>
        <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{metrics.incompleteRecords}</p>
      </article>
    </div>
  );
}
