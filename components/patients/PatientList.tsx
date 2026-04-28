"use client";

/**
 * components/patients/PatientList.tsx
 *
 * Lista filtrable de pacientes en la barra lateral.
 * Presentacional — recibe pacientes, el id seleccionado y callbacks.
 */

import { PatientStatusBadge } from "@/components/patients/PatientStatusBadge";
import { formatDate } from "@/lib/ui/format-date";
import {
  EmptyState,
  EmptyStateIconPatients,
  EmptyStateIconSearch,
} from "@/components/ui/empty-state";
import type { PatientRecord } from "@/types/patient";

type Props = {
  patients: PatientRecord[];
  selectedPatientId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (patientId: string) => void;
};

export function PatientList({
  patients,
  selectedPatientId,
  search,
  onSearchChange,
  onSelect,
}: Props) {
  return (
    <aside className="hce-surface">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Pacientes</h2>
          <p className="text-sm text-ink-soft">Selecciona un paciente para revisar su historial.</p>
        </div>
        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Buscar</span>
          <input
            className="hce-input"
            aria-label="Buscar paciente por nombre o documento"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nombre o documento"
          />
        </label>
      </div>

      <div className="mt-4 space-y-2" role="list" aria-label="Lista de pacientes">
        {patients.length === 0 ? (
          <EmptyState
            icon={search ? <EmptyStateIconSearch /> : <EmptyStateIconPatients />}
            title={search ? "Sin resultados" : "Sin pacientes"}
            description={
              search
                ? `No hay pacientes que coincidan con "${search}".`
                : "Las altas de pacientes se crean desde el flujo de consultas."
            }
            size="sm"
          />
        ) : (
          patients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              role="listitem"
              aria-current={selectedPatientId === patient.id ? "true" : undefined}
              onClick={() => onSelect(patient.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:bg-bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                selectedPatientId === patient.id
                  ? "border-teal-300 bg-teal-50"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink">{patient.full_name}</p>
                <PatientStatusBadge status={patient.status ?? "activo"} />
              </div>
              <p className="text-sm text-ink-soft">{patient.document_number}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {patient.birth_date
                  ? `Nacimiento: ${formatDate(patient.birth_date)}`
                  : "Sin fecha de nacimiento"}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
