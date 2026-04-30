"use client";

/**
 * components/patients/PatientAnalyticsBar.tsx
 *
 * Barra de métricas globales de pacientes (total, activos, seguimiento, alta).
 * Presentacional puro — solo recibe conteos.
 */

type Props = {
  total: number;
  activos: number;
  seguimiento: number;
  alta: number;
};

export function PatientAnalyticsBar({ total, activos, seguimiento, alta }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article className="hce-surface-soft flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Total Pacientes</p>
        <p className="mt-2 text-3xl font-bold text-ink">{total}</p>
      </article>
      <article className="hce-surface-soft flex flex-col justify-center border-l-4 border-emerald-400">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Activos</p>
        <p className="mt-2 text-3xl font-bold text-emerald-700">{activos}</p>
      </article>
      <article className="hce-surface-soft flex flex-col justify-center border-l-4 border-blue-400">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">En Seguimiento</p>
        <p className="mt-2 text-3xl font-bold text-blue-700">{seguimiento}</p>
      </article>
      <article className="hce-surface-soft flex flex-col justify-center border-l-4 border-gray-400">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">De Alta</p>
        <p className="mt-2 text-3xl font-bold text-gray-700">{alta}</p>
      </article>
    </div>
  );
}
