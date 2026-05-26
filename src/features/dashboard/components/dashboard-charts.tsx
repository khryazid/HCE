"use client";

import type {
  WeeklyConsultationPoint,
  SpecialtyBreakdown,
} from "@/features/dashboard/components/types";

type Props = {
  weeklyConsultations: WeeklyConsultationPoint[];
  weeklyMax: number;
  specialtyBreakdown: SpecialtyBreakdown[];
};

export function DashboardCharts({ weeklyConsultations, weeklyMax, specialtyBreakdown }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">

      {/* ── Consultas por semana ── */}
      <article className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 10% 90%, rgba(15,118,110,0.07) 0%, transparent 60%)",
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">Consultas por semana</h2>
          <span className="text-xs text-ink-soft">Últimos 7 días</span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {weeklyConsultations.map((point) => {
            const barHeight = Math.max(6, Math.round((point.total / weeklyMax) * 96));
            const isMax = point.total === weeklyMax && weeklyMax > 0;
            return (
              <div key={point.dayLabel} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-ink">{point.total || ""}</span>
                <div className="flex h-24 w-full items-end rounded-lg bg-bg-soft/80 px-1">
                  <div
                    className={`w-full rounded-md transition-all duration-500 ${
                      isMax
                        ? "bg-gradient-to-t from-accent to-teal-400"
                        : "bg-gradient-to-t from-accent/60 to-teal-300/60"
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-ink-soft">
                  {point.dayLabel.replace(".", "")}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      {/* ── Desglose por especialidad ── */}
      <article className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 90% 10%, rgba(15,118,110,0.07) 0%, transparent 60%)",
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">Desglose por especialidad</h2>
          <span className="text-xs text-ink-soft">Distribución actual</span>
        </div>
        {specialtyBreakdown.length === 0 ? (
          <div className="hce-empty mt-4">Sin consultas registradas para graficar.</div>
        ) : (
          <div className="mt-5 space-y-4">
            {specialtyBreakdown.map((entry) => (
              <div key={entry.specialty}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{entry.specialty}</span>
                  <span className="text-ink-soft">
                    {entry.total}{" "}
                    <span className="font-bold text-accent">{entry.percentage}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-soft">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-teal-400 transition-all duration-700"
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
