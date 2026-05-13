"use client";

/**
 * components/patients/PatientList.tsx
 * Lista filtrable de pacientes en la barra lateral. Presentacional.
 */

import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { PatientStatusBadge } from "@/features/patients/components/PatientStatusBadge";
import { calculateAge } from "@/features/dashboard/lib/metrics";
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
  allPatients: PatientRecord[];
};

export function PatientList({
  patients,
  selectedPatientId,
  search,
  onSearchChange,
  onSelect,
  allPatients,
}: Props) {
  const [statusFilter, setStatusFilter] = useState("all");

  const displayPatients = statusFilter === "all"
    ? patients
    : patients.filter(p => p.status === statusFilter);

  const counts = useMemo(() => ({
    all:      allPatients.length,
    activo:   allPatients.filter(p => p.status === "activo").length,
    alta:     allPatients.filter(p => p.status === "alta").length,
  }), [allPatients]);
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

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { value: "all",    label: `Todos ${counts.all}` },
            { value: "activo", label: `Activos ${counts.activo}` },
            { value: "alta",   label: `Alta ${counts.alta}` },
          ].map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                statusFilter === f.value
                  ? "bg-accent text-white"
                  : "bg-bg-soft text-ink-soft hover:text-ink border border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5" role="list" aria-label="Lista de pacientes">
          {displayPatients.length === 0 ? (
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
            displayPatients.map((patient) => {
              const isSelected = selectedPatientId === patient.id;
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => onSelect(patient.id)}
                  className={`group w-full rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isSelected
                      ? "border-accent/40 bg-accent/5"
                      : "border-border/60 bg-bg-soft/40 hover:bg-bg-soft hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar con inicial */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected ? "bg-accent/20 text-accent" : "bg-bg-soft text-ink-soft"
                    }`}>
                      {patient.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${isSelected ? "text-accent" : "text-ink"}`}>
                        {patient.full_name}
                      </p>
                      <p className="truncate text-[11px] text-ink-soft">
                        {patient.document_number}
                        {patient.birth_date ? ` · ${calculateAge(patient.birth_date)}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <PatientStatusBadge status={patient.status ?? "activo"} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
