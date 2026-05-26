"use client";

/**
 * app/(dashboard)/pacientes/page.tsx
 *
 * Container de la vista de pacientes.
 * Refactorizado a React Query.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useClinicalContext } from "@/features/consultations/context/clinical-context";
import { PacientesSkeleton } from "@/components/ui/skeletons";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import { PATIENT_STATUS_OPTIONS, type PatientRecord, type PatientStatus } from "@/features/patients/types";
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";
import { PatientList } from "@/features/patients/components/patient-list";
import { PatientProfileCard } from "@/features/patients/components/patient-profile-card";
import { PatientHistoryTimeline } from "@/features/patients/components/patient-history-timeline";
import { PatientAnalyticsBar } from "@/features/patients/components/patient-analytics-bar";
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

  // ─── Selección de paciente (sincroniza al contexto clínico global) ───────────
  const setSelectedPatientId = useCallback(
    (id: string) => {
      setSelectedPatientIdLocal(id);
      clinical.setSelectedPatientId(id);
      setStatusMessage(null);
    },
    [clinical],
  );

  // Auto-select first patient when data arrives
  useEffect(() => {
    if (!patientsLoading && patients.length > 0 && !selectedPatientId) {
      const initialId = clinical.selectedPatientId || patients[0]?.id || "";
      setSelectedPatientIdLocal(initialId);
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

  useEffect(() => {
    if (!patientsLoading && filteredPatients.length > 0 && !filteredPatients.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId(filteredPatients[0]?.id ?? "");
    }
  }, [filteredPatients, selectedPatientId, setSelectedPatientId, patientsLoading]);

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
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(15,118,110,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Historial de pacientes
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Pacientes
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-ink-soft">
              Aquí ves el historial de consultas y seguimientos por paciente. El alta de pacientes
              se hace desde Consultas para mantener un solo flujo de ingreso.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/consultas" className="hce-btn-primary">
              Crear consulta
            </Link>
            <Link href="/dashboard" className="hce-btn-secondary">
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

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <PatientList
          patients={filteredPatients}
          selectedPatientId={selectedPatientId}
          search={search}
          onSearchChange={setSearch}
          onSelect={setSelectedPatientId}
          allPatients={patients}
        />

        <section className="space-y-6">
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
        </section>
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

