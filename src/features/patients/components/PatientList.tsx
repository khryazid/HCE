"use client";

/**
 * components/patients/PatientList.tsx
 * Lista filtrable de pacientes en la barra lateral. Presentacional.
 */

import { Search } from "lucide-react";
import { PatientStatusBadge } from "@/features/patients/components/PatientStatusBadge";
import { formatDate } from "@/lib/ui/format-date";
import {
  EmptyState,
  EmptyStateIconPatients,
  EmptyStateIconSearch,
} from "@/components/ui/empty-state";
import type { PatientRecord } from "@/features/patients/types";

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
    <aside className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Directorio
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink">Pacientes</h2>
          <p className="text-sm text-ink-soft">
            Selecciona un paciente para ver su historial.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            className="hce-input pl-9"
            aria-label="Buscar paciente por nombre o documento"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nombre o documento"
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5" role="list" aria-label="Lista de pacientes">
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
          patients.map((patient) => {
            const isSelected = selectedPatientId === patient.id;
            return (
              <button
                key={patient.id}
                type="button"
                role="listitem"
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(patient.id)}
                className={`group w-full rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? "border-accent/40 bg-accent/8 shadow-sm"
                    : "border-border/60 bg-bg-soft/40 hover:border-border hover:bg-bg-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-semibold ${isSelected ? "text-accent" : "text-ink"}`}>
                    {patient.full_name}
                  </p>
                  <PatientStatusBadge status={patient.status ?? "activo"} />
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">{patient.document_number}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {patient.birth_date
                    ? `Nac. ${formatDate(patient.birth_date)}`
                    : "Sin fecha de nacimiento"}
                </p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
