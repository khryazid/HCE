"use client";

/**
 * components/patients/PatientProfileCard.tsx
 *
 * Tarjeta de perfil del paciente seleccionado: nombre, datos, cambio de estado y botón de borrado.
 * Presentacional con callbacks para cambio de estado y trigger de borrado.
 */

import { PATIENT_STATUS_OPTIONS, type PatientRecord, type PatientStatus } from "@/types/patient";
import { PatientStatusBadge } from "@/components/patients/PatientStatusBadge";
import { formatDate } from "@/lib/ui/format-date";
import { EmptyState, EmptyStateIconPatients } from "@/components/ui/empty-state";
import type { ClinicalRecordRecord } from "@/types/consultation";

type Props = {
  patient: PatientRecord | null;
  patientHistory: ClinicalRecordRecord[];
  statusSaving: boolean;
  statusMessage: string | null;
  onStatusChange: (nextStatus: PatientStatus) => void;
  onDeleteRequest: () => void;
};

export function PatientProfileCard({
  patient,
  patientHistory,
  statusSaving,
  statusMessage,
  onStatusChange,
  onDeleteRequest,
}: Props) {
  if (!patient) {
    return (
      <article className="hce-surface">
        <EmptyState
          icon={<EmptyStateIconPatients />}
          title="Ningun paciente seleccionado"
          description="Selecciona un paciente de la lista para ver su perfil y su historial clinico."
          size="md"
        />
      </article>
    );
  }

  return (
    <article className="hce-surface">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Nombre y datos básicos */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Perfil del paciente
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-ink">{patient.full_name}</h2>
            <PatientStatusBadge status={patient.status ?? "activo"} />
          </div>
          <p className="text-sm text-ink-soft">
            {patient.document_number}{patient.birth_date ? ` · ${formatDate(patient.birth_date)}` : ""}
          </p>
        </div>

        {/* Stats y selector de estado */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="hce-surface-soft">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">Consultas Registradas</p>
            <p className="mt-1 text-lg font-semibold text-ink">{patientHistory.length}</p>
          </div>
          <div className="hce-surface-soft">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">Ultima Atencion</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {patientHistory[0] ? formatDate(patientHistory[0].created_at) : "Ninguna"}
            </p>
          </div>
        </div>

        <div className="hce-surface-soft">
          <label className="block space-y-2 text-sm font-medium text-ink-soft">
            <span>Estado del paciente</span>
            <select
              className="hce-input disabled:cursor-not-allowed disabled:opacity-70"
              value={patient.status ?? "activo"}
              disabled={statusSaving}
              onChange={(event) => onStatusChange(event.target.value as PatientStatus)}
            >
              {(Object.keys(PATIENT_STATUS_OPTIONS) as PatientStatus[]).map((status) => (
                <option key={status} value={status}>
                  {PATIENT_STATUS_OPTIONS[status].label}
                </option>
              ))}
            </select>
          </label>
          {statusMessage ? (
            <p className="mt-2 text-xs text-ink-soft">{statusMessage}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onDeleteRequest}
        className="hce-chip mt-3 inline-flex items-center gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Eliminar paciente
      </button>
    </article>
  );
}
