"use client";

/**
 * components/patients/PatientHistoryTimeline.tsx
 *
 * Historial clínico del paciente seleccionado: lista de consultas expandibles,
 * con acciones por registro (seguimiento, PDF, eliminar).
 * Presentacional — recibe registros, estado expandido y callbacks.
 */

import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/ui/format-date";
import { generateConsultationPdf } from "@/lib/consultations/pdf";
import { loadLetterheadSettings } from "@/lib/local-data/letterhead";
import { getNextFollowUpDate, isFollowUpOverdue } from "@/lib/clinical/follow-up";
import {
  EmptyState,
  EmptyStateIconConsultations,
} from "@/components/ui/empty-state";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { TenantProfile } from "@/lib/supabase/profile";
import type { PatientRecord } from "@/types/patient";

// ─── Tipos y helpers ─────────────────────────────────────────────────────────

type PatientHistoryDetails = {
  consultationDate: string;
  gender: string;
  occupation: string;
  insurance: string;
  chiefComplaint: string;
  anamnesis: string;
  medicalHistory: string;
  backgrounds?: {
    pathological: string;
    surgical: string;
    allergic: string;
    pharmacological: string;
    family: string;
    toxic: string;
    gynecoObstetric: string;
  };
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
  };
  physicalExam: string;
  diagnosis: string;
  clinicalAnalysis: string;
  treatmentPlan: string;
  recommendations: string;
  warningSigns: string;
  evolutionStatus: string;
  nextFollowUpDate: string | null;
  isFollowUpOverdue: boolean;
  cieCodes: string[];
};

function getTextField(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getHistoryDetails(record: ClinicalRecordRecord): PatientHistoryDetails {
  const specialtyData = record.specialty_data as Record<string, unknown>;
  const nextFollowUpDateValue = getNextFollowUpDate(specialtyData);
  const patientSnapshot = (specialtyData.patient_snapshot ?? {}) as Record<string, string>;
  const vitalSigns = (specialtyData.vital_signs ?? {
    bloodPressure: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
  }) as PatientHistoryDetails["vitalSigns"];

  return {
    consultationDate: record.created_at,
    gender: getTextField(patientSnapshot.gender),
    occupation: getTextField(patientSnapshot.occupation),
    insurance: getTextField(patientSnapshot.insurance),
    chiefComplaint: getTextField(specialtyData.chief_complaint, record.chief_complaint),
    anamnesis: getTextField(specialtyData.anamnesis, "Sin anamnesis registrada"),
    medicalHistory: getTextField(specialtyData.medical_history),
    backgrounds: specialtyData.backgrounds as PatientHistoryDetails["backgrounds"],
    vitalSigns,
    physicalExam: getTextField(specialtyData.physical_exam),
    diagnosis: getTextField(specialtyData.diagnosis, "Sin diagnostico registrado"),
    clinicalAnalysis: getTextField(specialtyData.clinical_analysis),
    treatmentPlan: getTextField(specialtyData.treatment_plan, "Sin tratamiento registrado"),
    recommendations: getTextField(specialtyData.recommendations),
    warningSigns: getTextField(specialtyData.warning_signs),
    evolutionStatus: getTextField(specialtyData.evolution_status, "Sin evolucion registrada"),
    nextFollowUpDate: nextFollowUpDateValue,
    isFollowUpOverdue: isFollowUpOverdue(nextFollowUpDateValue),
    cieCodes: record.cie_codes,
  };
}

// ─── Componente ──────────────────────────────────────────────────────────────

type Props = {
  records: ClinicalRecordRecord[];
  expandedRecordIds: string[];
  selectedPatientId: string;
  selectedPatient: PatientRecord | null;
  tenant: TenantProfile | null;
  onToggleExpand: (recordId: string) => void;
  onDeleteRecordRequest: (record: ClinicalRecordRecord) => void;
};

export function PatientHistoryTimeline({
  records,
  expandedRecordIds,
  selectedPatientId,
  selectedPatient,
  tenant,
  onToggleExpand,
  onDeleteRecordRequest,
}: Props) {
  return (
    <article className="hce-surface">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Historial Clinico</h2>
          <p className="text-sm text-ink-soft">
            Todas las atenciones ordenadas de la mas reciente a la mas antigua.
          </p>
        </div>
        <Link
          href={`/consultas?mode=consulta&patientId=${selectedPatientId}`}
          className="hce-btn-secondary"
        >
          Nueva atencion
        </Link>
      </div>

      <div className="mt-6 space-y-4" role="list" aria-label="Historial de consultas">
        {records.length === 0 ? (
          <EmptyState
            icon={<EmptyStateIconConsultations />}
            title="Sin consultas registradas"
            description="Este paciente aun no tiene atenciones. Crea una nueva consulta para comenzar."
            size="md"
          />
        ) : (
          records.map((record) => {
            const details = getHistoryDetails(record);
            const isExpanded = expandedRecordIds.includes(record.id);

            return (
              <div
                key={record.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Cabecera clickable */}
                <button
                  id={`record-toggle-${record.id}`}
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`record-panel-${record.id}`}
                  onClick={() => onToggleExpand(record.id)}
                  className="flex w-full flex-col items-start justify-between gap-4 bg-bg-soft px-5 py-4 text-left transition hover:bg-teal-50/50 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800">
                        {record.specialty_kind.replace("-", " ")}
                      </span>
                      <span className="text-sm font-medium text-ink-soft">
                        {formatDateTime(details.consultationDate)}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-ink">
                      Motivo: {details.chiefComplaint}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="max-w-[200px] truncate text-sm font-medium text-ink-soft">
                      {details.diagnosis}
                    </p>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        isExpanded ? "bg-teal-100 text-teal-700" : "border bg-white text-ink-soft"
                      }`}
                    >
                      <svg
                        width="18" height="18" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Contenido expandido */}
                {isExpanded && (
                  <div
                    id={`record-panel-${record.id}`}
                    role="region"
                    aria-labelledby={`record-toggle-${record.id}`}
                    className="border-t border-border bg-card px-5 py-6"
                  >
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Columna izquierda */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                            Enfermedad Actual / Anamnesis
                          </h4>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">
                            {details.anamnesis}
                          </p>
                        </div>
                        {details.physicalExam && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                              Examen Físico
                            </h4>
                            <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">
                              {details.physicalExam}
                            </p>
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                            Impresión Diagnóstica
                          </h4>
                          <p className="mt-1.5 text-sm font-medium text-ink">{details.diagnosis}</p>
                          {details.cieCodes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {details.cieCodes.map((code) => (
                                <span
                                  key={code}
                                  className="inline-flex rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Columna derecha */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                            Plan de Tratamiento
                          </h4>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">
                            {details.treatmentPlan}
                          </p>
                        </div>
                        {details.evolutionStatus &&
                          details.evolutionStatus !== "Sin evolucion registrada" && (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                                Evolución
                              </h4>
                              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">
                                {details.evolutionStatus}
                              </p>
                            </div>
                          )}
                        {details.nextFollowUpDate && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                              Próximo Control
                            </h4>
                            <p
                              className={`mt-1.5 text-sm font-semibold ${
                                details.isFollowUpOverdue ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {formatDate(details.nextFollowUpDate)}{" "}
                              {details.isFollowUpOverdue ? "(Vencido)" : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones del registro */}
                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                      <Link
                        href={`/consultas?mode=seguimiento&patientId=${record.patient_id}&recordId=${record.id}`}
                        className="inline-flex rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      >
                        Crear seguimiento
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (!tenant || !selectedPatient) return;
                          const letterhead = loadLetterheadSettings(
                            tenant.doctor_id,
                            tenant.clinic_id,
                          );
                          generateConsultationPdf(letterhead, {
                            patientName: selectedPatient.full_name,
                            patientDocument: selectedPatient.document_number,
                            consultationDate: formatDateTime(details.consultationDate),
                            gender: details.gender,
                            occupation: details.occupation,
                            insurance: details.insurance,
                            chiefComplaint: details.chiefComplaint,
                            anamnesis: details.anamnesis,
                            medicalHistory: details.medicalHistory,
                            backgrounds: details.backgrounds,
                            vitalSigns: details.vitalSigns,
                            physicalExam: details.physicalExam,
                            diagnosis: details.diagnosis,
                            cieCodes: details.cieCodes,
                            clinicalAnalysis: details.clinicalAnalysis,
                            treatmentPlan: details.treatmentPlan,
                            recommendations: details.recommendations,
                            warningSigns: details.warningSigns,
                            specialtyKind: record.specialty_kind,
                            evolutionStatus: details.evolutionStatus,
                            followUpDate: details.nextFollowUpDate ?? undefined,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-bg-soft"
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Generar PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRecordRequest(record)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
