"use client";

/**
 * components/patients/PatientProfileCard.tsx
 * Tarjeta de perfil del paciente seleccionado. Presentacional.
 */

import { Trash2, ClipboardList, Clock } from "lucide-react";
import { PATIENT_STATUS_OPTIONS, type PatientRecord, type PatientStatus } from "@/features/patients/types";
import { PatientStatusBadge } from "@/features/patients/components/PatientStatusBadge";
import { formatDate } from "@/lib/ui/format-date";
import { EmptyState, EmptyStateIconPatients } from "@/components/ui/empty-state";
import type { ClinicalRecordRecord } from "@/features/consultations/types";

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
      <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <EmptyState
          icon={<EmptyStateIconPatients />}
          title="Ningún paciente seleccionado"
          description="Selecciona un paciente de la lista para ver su perfil y su historial clínico."
          size="md"
        />
      </article>
    );
  }

  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(15,118,110,0.07) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* Identity */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Perfil del paciente
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">
              {patient.full_name}
            </h2>
            <PatientStatusBadge status={patient.status ?? "activo"} />
          </div>
          <p className="text-sm text-ink-soft">
            {patient.document_number}
            {patient.birth_date ? ` · ${formatDate(patient.birth_date)}` : ""}
            {patient.phone ? ` · 📞 ${patient.phone}` : ""}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:w-72">
          <div className="rounded-2xl border border-border/60 bg-bg-soft/60 p-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Consultas
              </p>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-ink">{patientHistory.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-bg-soft/60 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Última atención
              </p>
            </div>
            <p className="mt-2 text-sm font-bold text-ink">
              {patientHistory[0] ? formatDate(patientHistory[0].created_at) : "—"}
            </p>
          </div>
        </div>

        {/* Status selector */}
        <div className="rounded-2xl border border-border/60 bg-bg-soft/60 p-4 lg:w-56">
          <label className="block space-y-2 text-sm font-medium text-ink-soft">
            <span>Estado del paciente</span>
            <select
              className="hce-input disabled:cursor-not-allowed disabled:opacity-70"
              value={patient.status ?? "activo"}
              disabled={statusSaving}
              onChange={(e) => onStatusChange(e.target.value as PatientStatus)}
            >
              {(Object.keys(PATIENT_STATUS_OPTIONS) as PatientStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PATIENT_STATUS_OPTIONS[s].label}
                </option>
              ))}
            </select>
          </label>
          {statusMessage ? (
            <p className="mt-2 text-xs text-ink-soft">{statusMessage}</p>
          ) : null}
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDeleteRequest}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Eliminar paciente
      </button>
    </article>
  );
}
