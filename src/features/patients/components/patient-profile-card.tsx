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
  if (!patient) return null;

  return (
    <article className="flex flex-col gap-6">
      {/* ── Identity ── */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-ink leading-none mb-2">
          {patient.full_name}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
          {patient.document_number && (
            <span className="font-mono text-xs tabular-nums bg-bg-soft border border-border px-1.5 py-0.5 rounded-md text-ink">{patient.document_number}</span>
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

      {/* ── Metrics ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-bg-soft/50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft mb-1 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-accent" />
            Atenciones
          </span>
          <span className="text-xl font-black text-ink">{patientHistory.length}</span>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-bg-soft/50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent" />
            Última vez
          </span>
          <span className="text-sm font-bold text-ink mt-0.5">
            {patientHistory[0] ? formatDate(patientHistory[0].created_at) : "N/A"}
          </span>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-bg-soft/50 p-4 relative group transition-colors hover:border-accent/30 hover:bg-accent/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft mb-1 flex items-center gap-1.5">
            Estado
          </span>
          <select
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             value={patient.status ?? "activo"}
             disabled={statusSaving}
             onChange={(e) => onStatusChange(e.target.value as PatientStatus)}
          >
             {(Object.keys(PATIENT_STATUS_OPTIONS) as PatientStatus[]).map((s) => (
                <option key={s} value={s}>{PATIENT_STATUS_OPTIONS[s].label}</option>
             ))}
          </select>
          <span className="text-sm font-bold text-ink mt-0.5 pointer-events-none capitalize flex items-center justify-between">
            {PATIENT_STATUS_OPTIONS[patient.status ?? "activo"]?.label ?? "Activo"}
            <svg className="w-3 h-3 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </span>
        </div>
      </div>
    </article>
  );
}
