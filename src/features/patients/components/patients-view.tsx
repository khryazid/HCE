"use client";

/**
 * app/(dashboard)/pacientes/page.tsx
 *
 * Container de la vista de pacientes.
 * Refactorizado a React Query.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useClinicalContext } from "@/features/consultations/context/clinical-context";
import { PacientesSkeleton } from "@/components/ui/skeletons";
import { ConfirmModal } from "@/components/ui/confirm-modal";

import "./patients.css";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import { PATIENT_STATUS_OPTIONS, type PatientRecord, type PatientStatus } from "@/features/patients/types";
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";
import { PatientList } from "@/features/patients/components/patient-list";
import { PatientProfileCard } from "@/features/patients/components/patient-profile-card";
import { PatientHistoryTimeline } from "@/features/patients/components/patient-history-timeline";
import { PatientAnalyticsBar } from "@/features/patients/components/patient-analytics-bar";
import { PatientProfileOverlay } from "@/features/patients/components/patient-profile-overlay";
import {
  usePatients,
  useClinicalRecords,
  useUpdatePatientStatus,
  useDeletePatient,
  useDeleteClinicalRecord,
} from "@/features/patients/lib/use-patients-queries";
import { usePatientsRealtime } from "@/features/patients/lib/use-patients-realtime";
import { useClinicalRecordsRealtime } from "@/features/patients/lib/use-clinical-records-realtime";
import { usePatientReadAudit } from "@/features/patients/lib/use-patient-read-audit";

// ─── Estado de borrado ─────────────────────────────────────────────────────────

type DeletePatientProgress = {
  total: number;
  done: number;
  label: string;
} | null;

// ─── Page Container ──────────────────────────────────────────────────────────

export default function PatientsView() {
  const { tenant, loading: tenantLoading } = useTenant();
  const clinical = useClinicalContext();

  // ─── React Query Hooks ───────────────────────────────────────────────────────
  const { data: patients = [], isLoading: patientsLoading, error: patientsError } = usePatients(tenant);
  const { data: records = [], isLoading: recordsLoading } = useClinicalRecords(tenant);
  
  const updateStatusMutation = useUpdatePatientStatus();
  const deletePatientMutation = useDeletePatient();
  const deleteRecordMutation = useDeleteClinicalRecord();

  // ─── Realtime ─ auto-refresh cuando otra sesión crea/edita/borra pacientes ──
  usePatientsRealtime(tenant);
  useClinicalRecordsRealtime(tenant);

  // ─── Local State ─────────────────────────────────────────────────────────────
  const [selectedPatientId, setSelectedPatientIdLocal] = useState<string>(
    clinical.selectedPatientId || "",
  );
  
  // ─── HIPAA Audit Logging ─────────────────────────────────────────────────────
  usePatientReadAudit(selectedPatientId);

  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [expandedRecordIds, setExpandedRecordIds] = useState<string[]>([]);
  const [deletePatientTarget, setDeletePatientTarget] = useState<PatientRecord | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<ClinicalRecordRecord | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<DeletePatientProgress>(null);
  const [overlayPatientId, setOverlayPatientId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Selección de paciente (sincroniza al contexto clínico global) ───────────
  const setSelectedPatientId = useCallback(
    (id: string) => {
      setSelectedPatientIdLocal(id);
      clinical.setSelectedPatientId(id);
      setStatusMessage(null);
    },
    [clinical],
  );

  // Auto-select ONLY if clinical.selectedPatientId is explicitly set
  useEffect(() => {
    if (!patientsLoading && patients.length > 0 && !selectedPatientId) {
      if (clinical.selectedPatientId) {
        setSelectedPatientIdLocal(clinical.selectedPatientId);
      }
    }
  }, [patientsLoading, patients, selectedPatientId, clinical.selectedPatientId]);

  // ─── Filtrado de pacientes ────────────────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    const normalizeString = (str: unknown) =>
      String(str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normalizedSearch = normalizeString(search);
    
    if (!normalizedSearch) return patients;
    
    return patients.filter((p) => {
      const name = normalizeString(p.full_name);
      const doc = normalizeString(p.document_number);
      
      // Búsqueda flexible de cédula/documento: ignoramos guiones, puntos y espacios
      const cleanDoc = String(p.document_number || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const cleanSearch = normalizedSearch.replace(/[^a-zA-Z0-9]/g, "");
      
      return name.includes(normalizedSearch) || 
             doc.includes(normalizedSearch) || 
             (cleanSearch.length > 0 && cleanDoc.includes(cleanSearch));
    });
  }, [patients, search]);

  // ─── Datos derivados ──────────────────────────────────────────────────────────
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const patientHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return records
      .filter((r) => r.patient_id === selectedPatient.id)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [records, selectedPatient]);

  const globalAnalytics = useMemo(() => {
    let activos = 0;
    let seguimiento = 0;
    let alta = 0;

    for (const p of patients) {
      if (p.status === "en-seguimiento") seguimiento++;
      else if (p.status === "alta") alta++;
      else if (p.status !== "inactivo") activos++;
    }

    return { total: patients.length, activos, seguimiento, alta };
  }, [patients]);

  // ─── Acciones ─────────────────────────────────────────────────────────────────

  async function handlePatientStatusChange(nextStatus: PatientStatus) {
    if (!tenant || !selectedPatient || nextStatus === selectedPatient.status) return;
    setStatusMessage(null);

    try {
      await updateStatusMutation.mutateAsync({ patient: selectedPatient, nextStatus, tenant });
      setStatusMessage(`Estado actualizado a ${PATIENT_STATUS_OPTIONS[nextStatus].label}.`);
    } catch (statusError) {
      setStatusMessage(
        statusError instanceof Error
          ? statusError.message
          : buildRetryableErrorMessage("actualizar el estado del paciente"),
      );
    }
  }

  function toggleRecordExpand(recordId: string) {
    setExpandedRecordIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId],
    );
  }

  // Borrado de paciente con feedback granular por ítem
  async function handleConfirmDeletePatient() {
    if (!deletePatientTarget || !tenant) return;

    try {
      await deletePatientMutation.mutateAsync({
        patient: deletePatientTarget,
        records,
        tenant,
        onProgress: (label, done, total) => setDeleteProgress({ label, done, total }),
      });
      setSelectedPatientId("");
    } finally {
      setDeleteProgress(null);
      setDeletePatientTarget(null);
    }
  }

  async function handleConfirmDeleteRecord() {
    if (!deleteRecordTarget || !tenant) return;

    await deleteRecordMutation.mutateAsync({ recordId: deleteRecordTarget.id, tenant });
    setDeleteRecordTarget(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (tenantLoading || patientsLoading || recordsLoading) return <PacientesSkeleton />;

  return (
    <section className="hce-page">

      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:rounded-3xl sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(15,118,110,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Historial de pacientes
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Pacientes
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft sm:leading-7">
              Aquí ves el historial de consultas y seguimientos por paciente. El alta de pacientes
              se hace desde Consultas para mantener un solo flujo de ingreso.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {tenant?.role !== "assistant" && (
              <Link href="/consultas" className="hce-btn-primary w-full sm:w-auto justify-center">
                Crear consulta
              </Link>
            )}
            <Link href="/dashboard" className="hce-btn-secondary w-full sm:w-auto justify-center">
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      {patientsError ? (
        <div className="hce-alert-error" role="alert" aria-live="assertive">
          {patientsError instanceof Error ? patientsError.message : buildRetryableErrorMessage("cargar pacientes")}
        </div>
      ) : null}

      <PatientAnalyticsBar
        total={globalAnalytics.total}
        activos={globalAnalytics.activos}
        seguimiento={globalAnalytics.seguimiento}
        alta={globalAnalytics.alta}
      />

      <div className="mt-8">
        <PatientList
          patients={filteredPatients}
          selectedPatientId={selectedPatientId}
          search={search}
          onSearchChange={setSearch}
          onSelect={setSelectedPatientId}
          allPatients={patients}
          records={records}
        />

        {selectedPatientId && selectedPatient && mounted && createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="gx-slideover-backdrop" 
              onClick={() => setSelectedPatientId("")} 
            />
            {/* Slide-over panel */}
            <div className="gx-slideover-panel">
              <div className="gx-slideover-header">
                <h2 className="gx-slideover-title">Expediente Clínico</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="hce-btn-secondary py-1.5 px-3 text-xs shadow-none border-border bg-bg-soft hover:bg-border"
                    onClick={() => setOverlayPatientId(selectedPatientId)}
                    title="Ver perfil completo"
                  >
                    Ver perfil
                  </button>
                  <button 
                    className="gx-slideover-close" 
                    onClick={() => setSelectedPatientId("")}
                    title="Cerrar"
                  >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <div className="gx-slideover-body space-y-6">
                <PatientProfileCard
                  patient={selectedPatient}
                  patientHistory={patientHistory}
                  statusSaving={updateStatusMutation.isPending}
                  statusMessage={statusMessage}
                  onStatusChange={(nextStatus) => void handlePatientStatusChange(nextStatus)}
                  onDeleteRequest={() => {
                    if (selectedPatient) setDeletePatientTarget(selectedPatient);
                  }}
                />

                <PatientHistoryTimeline
                  records={patientHistory}
                  expandedRecordIds={expandedRecordIds}
                  selectedPatientId={selectedPatientId}
                  selectedPatient={selectedPatient}
                  tenant={tenant}
                  onToggleExpand={toggleRecordExpand}
                  onDeleteRecordRequest={setDeleteRecordTarget}
                />
              </div>
            </div>
          </>,
          document.body
        )}
      </div>

      {/* Modal: Eliminar paciente con feedback de progreso */}
      <ConfirmModal
        open={deletePatientTarget !== null}
        title="Eliminar paciente"
        description={
          deleteProgress
            ? `${deleteProgress.label} (${deleteProgress.done}/${deleteProgress.total})`
            : `Se eliminara a ${deletePatientTarget?.full_name ?? ""} y todas sus consultas. Esta accion no se puede deshacer.`
        }
        confirmLabel={deleteProgress ? "Eliminando…" : "Eliminar"}
        variant="danger"
        onCancel={() => {
          if (!deleteProgress) setDeletePatientTarget(null);
        }}
        onConfirm={() => void handleConfirmDeletePatient()}
      />

      {/* Patient Profile Overlay */}
      {overlayPatientId && selectedPatient && overlayPatientId === selectedPatientId && (
        <PatientProfileOverlay
          patient={selectedPatient}
          records={records}
          open={true}
          onClose={() => setOverlayPatientId(null)}
        />
      )}

      {/* Modal: Eliminar consulta */}
      <ConfirmModal
        open={deleteRecordTarget !== null}
        title="Eliminar consulta"
        description="Se eliminara esta consulta del historial. Esta accion no se puede deshacer."
        confirmLabel={deleteRecordMutation.isPending ? "Eliminando..." : "Eliminar"}
        variant="danger"
        onCancel={() => setDeleteRecordTarget(null)}
        onConfirm={() => void handleConfirmDeleteRecord()}
      />
    </section>
  );
}

