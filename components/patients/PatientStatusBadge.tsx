"use client";

/**
 * components/patients/PatientStatusBadge.tsx
 *
 * Badge visual de estado del paciente (activo, alta, en-seguimiento, inactivo).
 * Componente presentacional puro — sin lógica de negocio.
 */

import { PATIENT_STATUS_OPTIONS, type PatientStatus } from "@/types/patient";

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const opt = PATIENT_STATUS_OPTIONS[status] ?? PATIENT_STATUS_OPTIONS.activo;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${opt.bg} ${opt.text} ${opt.border}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${opt.dot}`} />
      Estado: {opt.label}
    </span>
  );
}
