"use client";

/**
 * PatientProfileOverlay
 *
 * Modal/overlay that shows a complete patient profile with:
 * - Identity header (name, doc number, age, phone, status)
 * - Aggregate metrics (total consultations, first/last visit, specialty)
 * - Quick diagnosis (last diagnosis + CIE-11 codes)
 * - Stacked consultation timeline (chief complaint + date)
 *
 * Accessible: Escape closes, backdrop click closes, focus trapped.
 */

import { useEffect, useRef, useMemo } from "react";
import {
  X,
  ClipboardList,
  CalendarDays,
  Stethoscope,
  Phone,
  Activity,
  Clock,
} from "lucide-react";
import type { PatientRecord } from "@/features/patients/types";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import { PatientStatusBadge } from "@/features/patients/components/patient-status-badge";
import {
  calculatePatientProfileMetrics,
  buildPatientTimeline,
  calculateAge,
  formatRelativeDate,
} from "@/features/patients/lib/patient-profile-helpers";
import { formatDate } from "@/lib/ui/format-date";

type Props = {
  patient: PatientRecord;
  records: ClinicalRecordRecord[];
  open: boolean;
  onClose: () => void;
};

// ─── Specialty display labels ─────────────────────────────────────────────────

const SPECIALTY_LABELS: Record<string, string> = {
  "medicina-general": "Medicina General",
  pediatria: "Pediatría",
  ginecologia: "Ginecología",
  cardiologia: "Cardiología",
  dermatologia: "Dermatología",
  traumatologia: "Traumatología",
  oftalmologia: "Oftalmología",
  otorrinolaringologia: "Otorrinolaringología",
  neurologia: "Neurología",
  psiquiatria: "Psiquiatría",
  urologia: "Urología",
  endocrinologia: "Endocrinología",
  nefrologia: "Nefrología",
  neumologia: "Neumología",
  gastroenterologia: "Gastroenterología",
  reumatologia: "Reumatología",
  "medicina-interna": "Medicina Interna",
  cirugia: "Cirugía",
};

function specialtyLabel(key: string): string {
  return SPECIALTY_LABELS[key] ?? key;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientProfileOverlay({
  patient,
  records,
  open,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync the `open` prop with the native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Close on Escape (native dialog handles this, but we sync state)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Compute derived data
  const patientRecords = useMemo(
    () =>
      records
        .filter((r) => r.patient_id === patient.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [records, patient.id],
  );

  const metrics = useMemo(
    () => calculatePatientProfileMetrics(patientRecords),
    [patientRecords],
  );

  const timeline = useMemo(
    () => buildPatientTimeline(patientRecords),
    [patientRecords],
  );

  const age = calculateAge(patient.birth_date);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      id="patient-profile-overlay"
      className="gx-profile-overlay"
      onClick={(e) => {
        // Close on backdrop click (click on the dialog element itself, not its children)
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="gx-profile-overlay-content">
        {/* ── Close button ── */}
        <button
          type="button"
          onClick={onClose}
          className="gx-profile-overlay-close"
          aria-label="Cerrar perfil"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Header ── */}
        <header className="gx-profile-overlay-header">
          {/* Initials avatar */}
          <div className="gx-profile-avatar" aria-hidden>
            {patient.full_name
              .split(" ")
              .slice(0, 2)
              .map((w) => w.charAt(0).toUpperCase())
              .join("")}
          </div>

          <div className="gx-profile-identity">
            <h2 className="gx-profile-name">{patient.full_name}</h2>
            <div className="gx-profile-meta">
              {patient.document_number && (
                <span className="gx-profile-meta-item font-mono">
                  {patient.document_number}
                </span>
              )}
              {age !== null && (
                <span className="gx-profile-meta-item">
                  {age} año{age !== 1 ? "s" : ""}
                </span>
              )}
              {patient.birth_date && (
                <span className="gx-profile-meta-item">
                  {formatDate(patient.birth_date)}
                </span>
              )}
              {patient.phone && (
                <span className="gx-profile-meta-item gx-profile-meta-phone">
                  <Phone className="h-3 w-3" aria-hidden />
                  {patient.phone}
                </span>
              )}
            </div>
          </div>

          <PatientStatusBadge status={patient.status ?? "activo"} />
        </header>

        {/* ── Metrics row ── */}
        <div className="gx-profile-metrics">
          <div className="gx-profile-metric">
            <div className="gx-profile-metric-icon">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <span className="gx-profile-metric-value">
                {metrics.totalConsultations}
              </span>
              <span className="gx-profile-metric-label">consultas</span>
            </div>
          </div>

          <div className="gx-profile-metric">
            <div className="gx-profile-metric-icon">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <span className="gx-profile-metric-value">
                {metrics.firstVisitDate
                  ? formatRelativeDate(metrics.firstVisitDate)
                  : "—"}
              </span>
              <span className="gx-profile-metric-label">primera visita</span>
            </div>
          </div>

          <div className="gx-profile-metric">
            <div className="gx-profile-metric-icon">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="gx-profile-metric-value">
                {metrics.lastVisitDate
                  ? formatRelativeDate(metrics.lastVisitDate)
                  : "—"}
              </span>
              <span className="gx-profile-metric-label">última visita</span>
            </div>
          </div>

          <div className="gx-profile-metric">
            <div className="gx-profile-metric-icon">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div>
              <span className="gx-profile-metric-value">
                {metrics.lastSpecialty
                  ? specialtyLabel(metrics.lastSpecialty)
                  : "—"}
              </span>
              <span className="gx-profile-metric-label">especialidad</span>
            </div>
          </div>
        </div>

        {/* ── Quick diagnosis ── */}
        {metrics.lastDiagnosis && (
          <div className="gx-profile-diagnosis">
            <div className="gx-profile-diagnosis-header">
              <Activity className="h-4 w-4 text-accent" aria-hidden />
              <span className="gx-profile-diagnosis-title">
                Último diagnóstico
              </span>
            </div>
            <p className="gx-profile-diagnosis-text">
              {metrics.lastDiagnosis}
            </p>
            {metrics.lastCieCodes.length > 0 && (
              <div className="gx-profile-cie-codes">
                {metrics.lastCieCodes.map((code) => (
                  <span key={code} className="gx-profile-cie-tag">
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Timeline ── */}
        <div className="gx-profile-timeline">
          <h3 className="gx-profile-timeline-title">
            Historial de consultas
          </h3>

          {timeline.length === 0 ? (
            <p className="gx-profile-timeline-empty">
              Este paciente no tiene consultas registradas.
            </p>
          ) : (
            <ul className="gx-profile-timeline-list">
              {timeline.map((entry) => (
                <li key={entry.id} className="gx-profile-timeline-item">
                  <div className="gx-profile-timeline-dot" aria-hidden />
                  <div className="gx-profile-timeline-content">
                    <div className="gx-profile-timeline-row">
                      <span className="gx-profile-timeline-complaint">
                        {entry.chiefComplaint}
                      </span>
                      <span className="gx-profile-timeline-date">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                    <div className="gx-profile-timeline-sub">
                      <span className="gx-profile-timeline-specialty">
                        {specialtyLabel(entry.specialty)}
                      </span>
                      {entry.diagnosis && (
                        <>
                          <span className="gx-profile-timeline-sep">·</span>
                          <span className="gx-profile-timeline-diag">
                            {entry.diagnosis}
                          </span>
                        </>
                      )}
                    </div>
                    {entry.cieCodes.length > 0 && (
                      <div className="gx-profile-timeline-codes">
                        {entry.cieCodes.map((c) => (
                          <span key={c} className="gx-profile-cie-tag-sm">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
