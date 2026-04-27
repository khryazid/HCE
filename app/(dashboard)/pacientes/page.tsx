"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useClinicalContext } from "@/lib/context/clinical-context";
import { PacientesSkeleton } from "@/components/ui/skeletons";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  deletePatientLocal,
  deleteClinicalRecordLocal,
  enqueueSyncItem,
  listClinicalRecordsByTenant,
  listPatientsByTenant,
  updatePatientStatusLocal,
} from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord } from "@/types/consultation";
import { PATIENT_STATUS_OPTIONS, type PatientRecord, type PatientStatus } from "@/types/patient";
import { generateConsultationPdf } from "@/lib/consultations/pdf";
import { loadLetterheadSettings } from "@/lib/local-data/letterhead";

function StatusBadge({ status }: { status: PatientStatus }) {
  const opt = PATIENT_STATUS_OPTIONS[status] ?? PATIENT_STATUS_OPTIONS.activo;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${opt.bg} ${opt.text} ${opt.border}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${opt.dot}`} />
      {opt.label}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-EC");
}

function getTextField(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getNullableDate(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

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

type FollowUpTimelineFilter = "completados" | "pendientes" | "vencidos";
type DateRangeFilter = "all" | "7" | "30" | "90";

function getHistoryDetails(record: ClinicalRecordRecord): PatientHistoryDetails {
  const specialtyData = record.specialty_data as Record<string, unknown>;
  const nextFollowUpDate = getNullableDate(specialtyData.next_follow_up_date);

  const patientSnapshot = (specialtyData.patient_snapshot || {}) as Record<string, string>;
  const vitalSigns = (specialtyData.vital_signs || {
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
    nextFollowUpDate,
    isFollowUpOverdue: nextFollowUpDate ? new Date(nextFollowUpDate).getTime() < Date.now() : false,
    cieCodes: record.cie_codes,
  };
}

function getFollowUpTimelineState(
  record: ClinicalRecordRecord,
  details: PatientHistoryDetails,
): FollowUpTimelineFilter | null {
  const specialtyData = record.specialty_data as Record<string, unknown>;
  const followUpMode = specialtyData.follow_up_mode === "seguimiento";

  if (details.nextFollowUpDate) {
    return details.isFollowUpOverdue ? "vencidos" : "pendientes";
  }

  if (followUpMode) {
    return "completados";
  }

  return null;
}

export default function PacientesPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const clinical = useClinicalContext();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [records, setRecords] = useState<ClinicalRecordRecord[]>([]);
  const [selectedPatientId, setSelectedPatientIdLocal] = useState<string>(clinical.selectedPatientId || "");
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [expandedRecordIds, setExpandedRecordIds] = useState<string[]>([]);
  const [deletePatientTarget, setDeletePatientTarget] = useState<PatientRecord | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<ClinicalRecordRecord | null>(null);

  // Sync selected patient to clinical context
  function setSelectedPatientId(id: string) {
    setSelectedPatientIdLocal(id);
    clinical.setSelectedPatientId(id);
    setStatusMessage(null);
  }

  async function handlePatientStatusChange(nextStatus: PatientStatus) {
    if (!tenant || !selectedPatient || nextStatus === selectedPatient.status) {
      return;
    }

    setStatusSaving(true);
    setStatusMessage(null);

    const updatedAt = new Date().toISOString();
    const updatedPatient: PatientRecord = {
      ...selectedPatient,
      status: nextStatus,
      updated_at: updatedAt,
    };

    try {
      await updatePatientStatusLocal(selectedPatient.id, nextStatus);
      await enqueueSyncItem({
        id: crypto.randomUUID(),
        table_name: "patients",
        record_id: selectedPatient.id,
        action: "update",
        payload: updatedPatient,
        doctor_id: tenant.doctor_id,
        clinic_id: tenant.clinic_id,
        client_timestamp: Date.now(),
        status: "pending",
        retry_count: 0,
      });

      setPatients((current) =>
        current.map((patient) =>
          patient.id === selectedPatient.id ? updatedPatient : patient,
        ),
      );
      setStatusMessage(
        `Estado actualizado a ${PATIENT_STATUS_OPTIONS[nextStatus].label}.`,
      );
    } catch (statusError) {
      setStatusMessage(
        statusError instanceof Error
          ? statusError.message
          : "No se pudo actualizar el estado del paciente.",
      );
    } finally {
      setStatusSaving(false);
    }
  }

  useEffect(() => {
    if (tenantLoading || !tenant) {
      return;
    }

    let active = true;

    const bootstrap = async () => {
      try {
        const localPatients = await listPatientsByTenant(tenant.clinic_id);
        const localRecords = await listClinicalRecordsByTenant(
          tenant.doctor_id,
          tenant.clinic_id,
        );

        if (!active) {
          return;
        }

        setPatients(localPatients);
        setRecords(localRecords);
        // Use clinical context patient if available, otherwise first patient
        const initialPatientId = clinical.selectedPatientId || localPatients[0]?.id || "";
        setSelectedPatientIdLocal(initialPatientId);
      } catch (bootstrapError) {
        if (active) {
          setError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : "No se pudo cargar pacientes.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, tenantLoading]);

  const filteredPatients = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return patients;
    }

    return patients.filter((patient) => {
      return (
        patient.full_name.toLowerCase().includes(normalized) ||
        patient.document_number.toLowerCase().includes(normalized)
      );
    });
  }, [patients, search]);

  useEffect(() => {
    if (!filteredPatients.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId(filteredPatients[0]?.id ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPatients, selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const patientHistory = useMemo(() => {
    if (!selectedPatient) {
      return [];
    }

    return records
      .filter((record) => record.patient_id === selectedPatient.id)
      .sort((first, second) => second.updated_at.localeCompare(first.updated_at));
  }, [records, selectedPatient]);

  const globalAnalytics = useMemo(() => {
    let activos = 0;
    let seguimiento = 0;
    let alta = 0;
    let inactivos = 0;

    for (const p of patients) {
      if (p.status === "en-seguimiento") seguimiento++;
      else if (p.status === "alta") alta++;
      else if (p.status === "inactivo") inactivos++;
      else activos++; // default to activo
    }

    return { total: patients.length, activos, seguimiento, alta, inactivos };
  }, [patients]);

  function toggleRecordExpand(recordId: string) {
    setExpandedRecordIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId],
    );
  }

  if (tenantLoading || loading) {
    return <PacientesSkeleton />;
  }

  return (
    <section className="hce-page">
      <header className="hce-surface">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="hce-page-header">
            <p className="hce-kicker">
              Historial de pacientes
            </p>
            <h1 className="hce-page-title">Pacientes</h1>
            <p className="hce-page-lead max-w-3xl">
              Aqui ves el historial de consultas y seguimientos por paciente. El alta de pacientes
              se hace desde Consultas para mantener un solo flujo de ingreso.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/consultas"
              className="hce-btn-primary"
            >
              Crear consulta / paciente
            </Link>
            <Link
              href="/dashboard"
              className="hce-btn-secondary"
            >
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      {error ? <div className="hce-alert-error">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="hce-surface-soft flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Total Pacientes
          </p>
          <p className="mt-2 text-3xl font-bold text-ink">{globalAnalytics.total}</p>
        </article>
        <article className="hce-surface-soft flex flex-col justify-center border-l-4 border-emerald-400">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Activos
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{globalAnalytics.activos}</p>
        </article>
        <article className="hce-surface-soft flex flex-col justify-center border-l-4 border-blue-400">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            En Seguimiento
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{globalAnalytics.seguimiento}</p>
        </article>
        <article className="hce-surface-soft flex flex-col justify-center border-l-4 border-gray-400">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            De Alta
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-700">{globalAnalytics.alta}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hce-surface">
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Pacientes</h2>
              <p className="text-sm text-ink-soft">Selecciona un paciente para revisar su historial.</p>
            </div>
            <label className="block space-y-2 text-sm font-medium text-ink-soft">
              <span>Buscar</span>
              <input className="hce-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o documento" />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {filteredPatients.length === 0 ? (
              <div className="hce-empty">
                No hay pacientes que coincidan con tu busqueda.
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedPatientId(patient.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:bg-bg-soft ${
                    selectedPatientId === patient.id
                      ? "border-teal-300 bg-teal-50"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-ink">{patient.full_name}</p>
                    <StatusBadge status={patient.status ?? "activo"} />
                  </div>
                  <p className="text-sm text-ink-soft">{patient.document_number}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {patient.birth_date ? `Nacimiento: ${patient.birth_date}` : "Sin fecha de nacimiento"}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="space-y-6">
          <article className="hce-surface">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
                  Perfil del paciente
                </p>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-ink">
                    {selectedPatient ? selectedPatient.full_name : "Selecciona un paciente"}
                  </h2>
                  {selectedPatient ? <StatusBadge status={selectedPatient.status ?? "activo"} /> : null}
                </div>
                <p className="text-sm text-ink-soft">
                  {selectedPatient
                    ? `${selectedPatient.document_number}${selectedPatient.birth_date ? ` · ${selectedPatient.birth_date}` : ""}`
                    : "Aquí verás los datos generales y su historia clínica."}
                </p>
              </div>

              {patientHistory ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="hce-surface-soft">
                    <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">Consultas Registradas</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{patientHistory.length}</p>
                  </div>
                  <div className="hce-surface-soft">
                    <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">Ultima Atencion</p>
                    <p className="mt-1 text-lg font-semibold text-ink">
                      {patientHistory[0] ? formatDate(patientHistory[0].created_at).split(",")[0] : "Ninguna"}
                    </p>
                  </div>
                </div>
              ) : null}

              {selectedPatient ? (
                <div className="hce-surface-soft">
                  <label className="block space-y-2 text-sm font-medium text-ink-soft">
                    <span>Estado del paciente</span>
                    <select
                      className="hce-input disabled:cursor-not-allowed disabled:opacity-70"
                      value={selectedPatient.status ?? "activo"}
                      disabled={statusSaving}
                      onChange={(event) => {
                        void handlePatientStatusChange(event.target.value as PatientStatus);
                      }}
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
              ) : null}
            </div>

            {selectedPatient ? (
              <button type="button" onClick={() => setDeletePatientTarget(selectedPatient)} className="hce-chip mt-3 inline-flex items-center gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Eliminar paciente
              </button>
            ) : null}
          </article>

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

            <div className="mt-6 space-y-4">
              {patientHistory.length === 0 ? (
                <div className="hce-empty p-8">
                  Este paciente aun no tiene consultas registradas.
                </div>
              ) : (
                patientHistory.map((record) => {
                  const details = getHistoryDetails(record);
                  const isExpanded = expandedRecordIds.includes(record.id);

                  return (
                    <div
                      key={record.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Cabecera Clickable */}
                      <button
                        type="button"
                        onClick={() => toggleRecordExpand(record.id)}
                        className="flex w-full flex-col items-start justify-between gap-4 bg-bg-soft px-5 py-4 text-left transition hover:bg-teal-50/50 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800">
                              {record.specialty_kind.replace("-", " ")}
                            </span>
                            <span className="text-sm font-medium text-ink-soft">
                              {formatDate(details.consultationDate)}
                            </span>
                          </div>
                          <p className="text-base font-semibold text-ink">
                            Motivo: {details.chiefComplaint}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-medium text-ink-soft max-w-[200px] truncate">
                            {details.diagnosis}
                          </p>
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isExpanded ? "bg-teal-100 text-teal-700" : "bg-white text-ink-soft border"}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {/* Contenido Expandido */}
                      {isExpanded && (
                        <div className="border-t border-border bg-card px-5 py-6">
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Columna Izquierda */}
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Enfermedad Actual / Anamnesis</h4>
                                <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{details.anamnesis}</p>
                              </div>
                              {details.physicalExam && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Examen Físico</h4>
                                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{details.physicalExam}</p>
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Impresión Diagnóstica</h4>
                                <p className="mt-1.5 text-sm font-medium text-ink">{details.diagnosis}</p>
                                {details.cieCodes.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {details.cieCodes.map((code) => (
                                      <span key={code} className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                                        {code}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Columna Derecha */}
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Plan de Tratamiento</h4>
                                <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{details.treatmentPlan}</p>
                              </div>
                              {details.evolutionStatus && details.evolutionStatus !== "Sin evolucion registrada" && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Evolución</h4>
                                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{details.evolutionStatus}</p>
                                </div>
                              )}
                              {details.nextFollowUpDate && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Próximo Control</h4>
                                  <p className={`mt-1.5 text-sm font-semibold ${details.isFollowUpOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {new Date(details.nextFollowUpDate).toLocaleDateString("es-EC")} {details.isFollowUpOverdue ? "(Vencido)" : ""}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                        <Link
                          href={`/consultas?mode=seguimiento&patientId=${record.patient_id}&recordId=${record.id}`}
                          className="inline-flex rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900 transition hover:bg-teal-100"
                        >
                          Crear seguimiento
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            if (!tenant || !selectedPatient) return;
                            const letterhead = loadLetterheadSettings(tenant.doctor_id, tenant.clinic_id);
                            generateConsultationPdf(letterhead, {
                              patientName: selectedPatient.full_name,
                              patientDocument: selectedPatient.document_number,
                              consultationDate: formatDate(details.consultationDate),
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          Generar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRecordTarget(record)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
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
        </section>
      </div>

      {/* Delete patient modal */}
      <ConfirmModal
        open={deletePatientTarget !== null}
        title="Eliminar paciente"
        description={`Se eliminara a ${deletePatientTarget?.full_name ?? ""} y todas sus consultas. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeletePatientTarget(null)}
        onConfirm={async () => {
          if (!deletePatientTarget || !tenant) return;
          // Delete all records for this patient
          const patientRecords = records.filter(r => r.patient_id === deletePatientTarget.id);
          for (const rec of patientRecords) {
            await deleteClinicalRecordLocal(rec.id);
            await enqueueSyncItem({
              id: crypto.randomUUID(),
              table_name: "clinical_records",
              record_id: rec.id,
              action: "delete",
              payload: { id: rec.id },
              doctor_id: tenant.doctor_id,
              clinic_id: tenant.clinic_id,
              client_timestamp: Date.now(),
              status: "pending",
              retry_count: 0,
            });
          }
          await deletePatientLocal(deletePatientTarget.id);
          await enqueueSyncItem({
            id: crypto.randomUUID(),
            table_name: "patients",
            record_id: deletePatientTarget.id,
            action: "delete",
            payload: { id: deletePatientTarget.id },
            doctor_id: tenant.doctor_id,
            clinic_id: tenant.clinic_id,
            client_timestamp: Date.now(),
            status: "pending",
            retry_count: 0,
          });
          setPatients(prev => prev.filter(p => p.id !== deletePatientTarget.id));
          setRecords(prev => prev.filter(r => r.patient_id !== deletePatientTarget.id));
          setSelectedPatientId("");
          setDeletePatientTarget(null);
        }}
      />

      {/* Delete consultation modal */}
      <ConfirmModal
        open={deleteRecordTarget !== null}
        title="Eliminar consulta"
        description="Se eliminara esta consulta del historial. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteRecordTarget(null)}
        onConfirm={async () => {
          if (!deleteRecordTarget || !tenant) return;
          await deleteClinicalRecordLocal(deleteRecordTarget.id);
          await enqueueSyncItem({
            id: crypto.randomUUID(),
            table_name: "clinical_records",
            record_id: deleteRecordTarget.id,
            action: "delete",
            payload: { id: deleteRecordTarget.id },
            doctor_id: tenant.doctor_id,
            clinic_id: tenant.clinic_id,
            client_timestamp: Date.now(),
            status: "pending",
            retry_count: 0,
          });
          setRecords(prev => prev.filter(r => r.id !== deleteRecordTarget.id));
          setDeleteRecordTarget(null);
        }}
      />
    </section>
  );
}
