"use client";

/**
 * components/patients/ExportZipButton.tsx
 *
 * Button that exports a patient's full clinical history as a ZIP archive.
 * Shows a progress indicator while generating PDFs and zipping.
 *
 * Usage:
 *   <ExportZipButton patient={patient} records={records} tenant={tenant} />
 */

import { useState } from "react";
import { exportPatientZip, downloadZipBlob } from "@/features/patients/lib/export-zip";
import { buildLetterheadFromSession } from "@/features/dashboard/lib/letterhead";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PatientRecord } from "@/features/patients/types";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { TenantProfile } from "@/lib/supabase/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  patient: PatientRecord;
  records: ClinicalRecordRecord[];
  tenant: TenantProfile | null;
};

type ExportState =
  | { status: "idle" }
  | { status: "generating"; current: number; total: number; label: string }
  | { status: "done" }
  | { status: "error"; message: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportZipButton({ patient, records, tenant }: Props) {
  const [state, setState] = useState<ExportState>({ status: "idle" });

  const isGenerating = state.status === "generating";
  const hasRecords   = records.length > 0;

  async function handleExport() {
    if (isGenerating || !hasRecords || !tenant) return;

    setState({ status: "generating", current: 0, total: records.length + 2, label: "Iniciando…" });

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const letterhead = buildLetterheadFromSession(
        tenant.doctor_id,
        tenant.clinic_id,
        session?.user?.user_metadata ?? {},
        tenant.specialties,
      );

      const blob = await exportPatientZip({
        patient,
        records,
        letterhead,
        onProgress: ({ current, total, label }) => {
          setState({ status: "generating", current, total, label });
        },
      });

      downloadZipBlob(blob, patient.full_name);
      setState({ status: "done" });

      // Reset to idle after 3 seconds
      setTimeout(() => setState({ status: "idle" }), 3_000);
    } catch (err) {
      console.error("[ExportZip] Error:", err);
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Error inesperado al exportar.",
      });
      setTimeout(() => setState({ status: "idle" }), 5_000);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.status === "generating") {
    const { current, total, label } = state;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`Exportando: ${label}`}
        className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
        style={{ minWidth: 220 }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-ink-soft truncate">{label}</span>
          <span className="shrink-0 text-xs font-semibold text-teal-600">{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (state.status === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        ZIP descargado
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {state.message}
      </div>
    );
  }

  // Idle state
  return (
    <button
      id="export-zip-btn"
      type="button"
      onClick={handleExport}
      disabled={!hasRecords}
      title={
        !hasRecords
          ? "Este paciente no tiene consultas para exportar"
          : `Exportar ${records.length} consulta${records.length !== 1 ? "s" : ""} como ZIP`
      }
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {/* Archive icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
      Exportar ZIP
      {hasRecords && (
        <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
          {records.length}
        </span>
      )}
    </button>
  );
}
