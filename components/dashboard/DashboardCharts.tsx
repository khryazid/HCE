"use client";

/**
 * components/dashboard/DashboardCharts.tsx
 *
 * Gráfica de consultas semanales + desglose por especialidad.
 */

import type { WeeklyConsultationPoint, SpecialtyBreakdown } from "@/components/dashboard/types";

type Props = {
  weeklyConsultations: WeeklyConsultationPoint[];
  weeklyMax: number;
  specialtyBreakdown: SpecialtyBreakdown[];
};

export function DashboardCharts({ weeklyConsultations, weeklyMax, specialtyBreakdown }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Consultas por semana */}
      <article className="hce-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[color:var(--ink)]">Consultas por semana</h2>
          <span className="text-xs text-[color:var(--ink-soft)]">Ultimos 7 dias</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {weeklyConsultations.map((point) => {
            const barHeight = Math.max(8, Math.round((point.total / weeklyMax) * 120));
            return (
              <div key={point.dayLabel} className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-[color:var(--ink)]">
                  {point.total}
                </span>
                <div className="flex h-32 w-full items-end rounded-lg bg-[color:var(--bg-soft)] px-1">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-teal-600 to-cyan-400"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <span className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)]">
                  {point.dayLabel.replace(".", "")}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      {/* Desglose por especialidad */}
      <article className="hce-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[color:var(--ink)]">Desglose por especialidad</h2>
          <span className="text-xs text-[color:var(--ink-soft)]">Distribucion actual</span>
        </div>
        {specialtyBreakdown.length === 0 ? (
          <div className="hce-empty mt-4">Sin consultas registradas para graficar.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {specialtyBreakdown.map((entry) => (
              <div key={entry.specialty}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-[0.1em] text-[color:var(--ink)]">
                    {entry.specialty}
                  </span>
                  <span className="text-[color:var(--ink-soft)]">
                    {entry.total} ({entry.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--bg-soft)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    style={{ width: `${entry.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
