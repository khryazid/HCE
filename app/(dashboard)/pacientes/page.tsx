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
  anamnesis: string;
  symptoms: string;
  diagnosis: string;
  treatmentPlan: string;
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

  return {
    consultationDate: record.created_at,
    anamnesis: getTextField(specialtyData.anamnesis, record.chief_complaint),
    symptoms: getTextField(specialtyData.symptoms, "Sin sintomas registrados"),
    diagnosis: getTextField(specialtyData.diagnosis, "Sin diagnostico registrado"),
    treatmentPlan: getTextField(specialtyData.treatment_plan, "Sin tratamiento registrado"),
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
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpTimelineFilter>("pendientes");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
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

  const followUpTimelineRecords = useMemo(() => {
    return patientHistory
      .map((record) => {
        const details = getHistoryDetails(record);
        const timelineState = getFollowUpTimelineState(record, details);
        return { record, details, timelineState };
      })
      .filter((item) => item.timelineState !== null);
  }, [patientHistory]);

  const filteredFollowUpTimelineRecords = useMemo(() => {
    return followUpTimelineRecords.filter(
      (item) => item.timelineState === followUpFilter,
    );
  }, [followUpFilter, followUpTimelineRecords]);

  const specialtyOptions = useMemo(() => {
    const specialties = new Set<string>();
    for (const item of followUpTimelineRecords) {
      specialties.add(item.record.specialty_kind);
    }
    return Array.from(specialties).sort((a, b) => a.localeCompare(b));
  }, [followUpTimelineRecords]);

  const timelineRecordsWithFilters = useMemo(() => {
    const now = Date.now();
    const maxAgeMs =
      dateRangeFilter === "all" ? null : Number(dateRangeFilter) * 24 * 60 * 60 * 1000;

    return filteredFollowUpTimelineRecords.filter((item) => {
      if (specialtyFilter !== "all" && item.record.specialty_kind !== specialtyFilter) {
        return false;
      }

      if (maxAgeMs === null) {
        return true;
      }

      const consultationTime = new Date(item.details.consultationDate).getTime();
      if (Number.isNaN(consultationTime)) {
        return false;
      }

      return now - consultationTime <= maxAgeMs;
    });
  }, [dateRangeFilter, filteredFollowUpTimelineRecords, specialtyFilter]);

  const followUpCounts = useMemo(() => {
    return followUpTimelineRecords.reduce(
      (acc, item) => {
        if (item.timelineState) {
          acc[item.timelineState] += 1;
        }
        return acc;
      },
      {
        completados: 0,
        pendientes: 0,
        vencidos: 0,
      } as Record<FollowUpTimelineFilter, number>,
    );
  }, [followUpTimelineRecords]);

  useEffect(() => {
    if (!timelineRecordsWithFilters.some((item) => item.record.id === selectedRecordId)) {
      setSelectedRecordId(timelineRecordsWithFilters[0]?.record.id ?? "");
    }
  }, [timelineRecordsWithFilters, selectedRecordId]);

  const selectedFollowUp = useMemo(
    () =>
      followUpTimelineRecords.find((item) => item.record.id === selectedRecordId) ??
      timelineRecordsWithFilters[0] ??
      followUpTimelineRecords[0] ??
      null,
    [followUpTimelineRecords, selectedRecordId, timelineRecordsWithFilters],
  );

  const selectedRecord = selectedFollowUp?.record ?? null;
  const selectedDetails = selectedFollowUp?.details ?? null;
  const overdueFollowUps = followUpTimelineRecords.filter(
    (item) => item.timelineState === "vencidos",
  );

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

      <div className="grid gap-4 md:grid-cols-3">
        <article className="hce-surface-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Pacientes registrados
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{patients.length}</p>
        </article>
        <article className="hce-surface-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Consultas del paciente
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{patientHistory.length}</p>
        </article>
        <article className="hce-surface-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Seguimientos pendientes
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{overdueFollowUps.length}</p>
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

              {selectedPatient ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="hce-surface-soft">
                    <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">Consultas</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{patientHistory.length}</p>
                  </div>
                  <div className="hce-surface-soft">
                    <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">Seguimientos</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{followUpTimelineRecords.length}</p>
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
                <h2 className="text-lg font-semibold text-ink">Timeline de seguimientos</h2>
                <p className="text-sm text-ink-soft">
                  Filtro por estado para revisar seguimientos completados, pendientes y vencidos.
                </p>
              </div>
              <Link
                href="/consultas"
                className="hce-btn-secondary"
              >
                Nueva consulta
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {([
                ["pendientes", "Pendientes"],
                ["vencidos", "Vencidos"],
                ["completados", "Completados"],
              ] as Array<[FollowUpTimelineFilter, string]>).map(([filter, label]) => (
                <button key={filter} type="button" onClick={() => setFollowUpFilter(filter)} className={`hce-chip ${
                    followUpFilter === filter
                      ? "border-teal-300 bg-teal-50 text-teal-900"
                      : "border-border bg-card text-ink-soft hover:bg-bg-soft"
                  }`}
                >
                  {label} ({followUpCounts[filter]})
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium text-ink-soft">
                <span>Rango de fecha</span>
                <select className="hce-input" value={dateRangeFilter} onChange={(event) => setDateRangeFilter(event.target.value as DateRangeFilter)}>
                  <option value="all">Todo el historial</option>
                  <option value="7">Ultimos 7 dias</option>
                  <option value="30">Ultimos 30 dias</option>
                  <option value="90">Ultimos 90 dias</option>
                </select>
              </label>

              <label className="block space-y-2 text-sm font-medium text-ink-soft">
                <span>Especialidad</span>
                <select className="hce-input" value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)}>
                  <option value="all">Todas</option>
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {timelineRecordsWithFilters.length === 0 ? (
                <div className="hce-empty p-5">
                  No hay seguimientos con los filtros seleccionados.
                </div>
              ) : (
                timelineRecordsWithFilters.map((item) => {
                  const { record, details, timelineState } = item;
                  const isSelected = selectedRecord?.id === record.id;
                  const isExpanded = expandedRecordIds.includes(record.id) || isSelected;

                  return (
                    <article
                      key={record.id}
                      className={`w-full rounded-2xl border p-4 ${
                        isSelected ? "border-teal-300 bg-teal-50" : "border-border bg-card"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecordId(record.id);
                          toggleRecordExpand(record.id);
                        }}
                        className="w-full text-left transition hover:bg-bg-soft"
                      >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {record.specialty_kind} · {formatDate(details.consultationDate)}
                          </p>
                          <p className="mt-1 text-sm text-ink-soft">{details.diagnosis}</p>
                        </div>
                        <span className="rounded-full bg-bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
                          {timelineState === "vencidos"
                            ? "Seguimiento vencido"
                            : timelineState === "pendientes"
                              ? "Seguimiento pendiente"
                              : "Seguimiento completado"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </p>

                      </button>
                      {isExpanded ? (
                        <>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Anamnesis</p>
                              <p className="mt-1 text-sm text-ink-soft">{details.anamnesis}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Tratamiento</p>
                              <p className="mt-1 text-sm text-ink-soft">{details.treatmentPlan}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-soft">
                            {details.cieCodes.map((code) => (
                              <span key={code} className="rounded-full bg-bg-soft px-2.5 py-1">
                                {code}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
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
                              anamnesis: details.anamnesis,
                              symptoms: details.symptoms,
                              diagnosis: details.diagnosis,
                              cieCodes: details.cieCodes,
                              treatmentPlan: details.treatmentPlan,
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
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </article>

          <article className="hce-surface">
            <h2 className="text-lg font-semibold text-ink">Detalle del seguimiento</h2>
            {selectedDetails ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 hce-surface-soft text-sm text-ink-soft">
                  <p><span className="font-semibold text-ink">Fecha:</span> {formatDate(selectedDetails.consultationDate)}</p>
                  <p><span className="font-semibold text-ink">Sintomas:</span> {selectedDetails.symptoms}</p>
                  <p><span className="font-semibold text-ink">Diagnostico:</span> {selectedDetails.diagnosis}</p>
                  <p><span className="font-semibold text-ink">Evolucion:</span> {selectedDetails.evolutionStatus}</p>
                  <p><span className="font-semibold text-ink">Proximo control:</span> {selectedDetails.nextFollowUpDate ?? "No programado"}</p>
                </div>
                <div className="space-y-3 hce-surface-soft bg-[color:var(--card)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Acciones</p>
                  <Link
                    href="/consultas"
                    className="hce-btn-primary"
                  >
                    Registrar nueva consulta o seguimiento
                  </Link>
                  <p className="text-sm text-ink-soft">
                    El paciente se crea y actualiza desde Consultas. En esta vista solo revisas su historia y controlas el seguimiento.
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">
                Selecciona una consulta para ver el detalle del seguimiento.
              </p>
            )}
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
