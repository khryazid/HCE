"use client";

/**
 * components/patients/PatientProfileCard.tsx
 * Tarjeta de perfil del paciente seleccionado. Presentacional.
 * Diseñada para funcionar dentro de un slide-over panel (max-width ~500px).
 */

import { Trash2, ClipboardList, Clock, Phone } from "lucide-react";
import { PATIENT_STATUS_OPTIONS, type PatientRecord, type PatientStatus } from "@/features/patients/types";
import { PatientStatusBadge } from "@/features/patients/components/patient-status-badge";
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
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(15,118,110,0.07) 0%, transparent 60%)",
        }}
      />

      {/* ── Identity header ── */}
      <div className="relative space-y-3 p-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Perfil del paciente
        </p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink truncate">
              {patient.full_name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              {patient.document_number && (
                <span className="font-mono text-xs tabular-nums">{patient.document_number}</span>
              )}
              {patient.birth_date && (
                <span>{formatDate(patient.birth_date)}</span>
              )}
              {patient.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" aria-hidden />
                  {patient.phone}
                </span>
              )}
            </div>
          </div>
          <PatientStatusBadge status={patient.status ?? "activo"} />
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="relative grid grid-cols-3 gap-px border-t border-border bg-border">
        {/* Consultas */}
        <div className="flex flex-col items-center gap-1.5 bg-card px-3 py-4">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-accent" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Consultas
            </span>
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-ink">{patientHistory.length}</p>
        </div>

        {/* Última atención */}
        <div className="flex flex-col items-center gap-1.5 bg-card px-3 py-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-accent" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Última
            </span>
          </div>
          <p className="text-sm font-bold text-ink text-center">
            {patientHistory[0] ? formatDate(patientHistory[0].created_at) : "—"}
          </p>
        </div>

        {/* Estado */}
        <div className="flex flex-col items-center gap-1.5 bg-card px-3 py-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            Estado
          </span>
          <select
            className="w-full max-w-[130px] rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-xs font-semibold text-ink outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-70"
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
        </div>
      </div>

      {statusMessage ? (
        <p className="px-6 py-2 text-xs text-ink-soft">{statusMessage}</p>
      ) : null}

      {/* ── Delete action ── */}
      <div className="relative border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={onDeleteRequest}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Eliminar paciente
        </button>
      </div>
    </article>
  );
}
