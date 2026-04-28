"use client";

/**
 * app/(dashboard)/pacientes/page.tsx
 *
 * Container de la vista de pacientes.
 * Toda la lógica de carga, filtrado, estado y acciones vive aquí.
 * Los componentes presentacionales se importan desde components/patients/.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";
import { PatientList } from "@/components/patients/PatientList";
import { PatientProfileCard } from "@/components/patients/PatientProfileCard";
import { PatientHistoryTimeline } from "@/components/patients/PatientHistoryTimeline";
import { PatientAnalyticsBar } from "@/components/patients/PatientAnalyticsBar";

// ─── Estado de borrado ─────────────────────────────────────────────────────────

type DeletePatientProgress = {
  total: number;
  done: number;
  label: string;
} | null;

// ─── Page Container ──────────────────────────────────────────────────────────

export default function PacientesPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const clinical = useClinicalContext();

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [records, setRecords] = useState<ClinicalRecordRecord[]>([]);
  const [selectedPatientId, setSelectedPatientIdLocal] = useState<string>(
    clinical.selectedPatientId || "",
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
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

  // ─── Bootstrap de datos ───────────────────────────────────────────────────────
  useEffect(() => {
    if (tenantLoading || !tenant) return;

    let active = true;

    const bootstrap = async () => {
      try {
        const [localPatients, localRecords] = await Promise.all([
          listPatientsByTenant(tenant.clinic_id),
          listClinicalRecordsByTenant(tenant.doctor_id, tenant.clinic_id),
        ]);

        if (!active) return;

        setPatients(localPatients);
        setRecords(localRecords);
        const initialId = clinical.selectedPatientId || localPatients[0]?.id || "";
        setSelectedPatientIdLocal(initialId);
      } catch (bootstrapError) {
        if (active) {
          setError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : buildRetryableErrorMessage("cargar pacientes"),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();
    return () => { active = false; };
  }, [tenant, tenantLoading, clinical.selectedPatientId]);

  // ─── Filtrado de pacientes ────────────────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return patients;
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(normalized) ||
        p.document_number.toLowerCase().includes(normalized),
    );
  }, [patients, search]);

  useEffect(() => {
    if (!filteredPatients.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId(filteredPatients[0]?.id ?? "");
    }
  }, [filteredPatients, selectedPatientId, setSelectedPatientId]);

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

    setStatusSaving(true);
    setStatusMessage(null);

    const updatedAt = new Date().toISOString();
    const updatedPatient: PatientRecord = { ...selectedPatient, status: nextStatus, updated_at: updatedAt };

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
        current.map((p) => (p.id === selectedPatient.id ? updatedPatient : p)),
      );
      setStatusMessage(`Estado actualizado a ${PATIENT_STATUS_OPTIONS[nextStatus].label}.`);
    } catch (statusError) {
      setStatusMessage(
        statusError instanceof Error
          ? statusError.message
          : buildRetryableErrorMessage("actualizar el estado del paciente"),
      );
    } finally {
      setStatusSaving(false);
    }
  }

  function toggleRecordExpand(recordId: string) {
    setExpandedRecordIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId],
    );
  }

  // Borrado de paciente con feedback granular por ítem (NF tasklist Paso 3)
  async function handleConfirmDeletePatient() {
    if (!deletePatientTarget || !tenant) return;

    const patientRecords = records.filter((r) => r.patient_id === deletePatientTarget.id);
    const totalSteps = patientRecords.length + 1; // registros + el propio paciente
    let done = 0;

    const updateProgress = (label: string) => {
      done++;
      setDeleteProgress({ total: totalSteps, done, label });
    };

    try {
      // Eliminar cada consulta con feedback
      for (const rec of patientRecords) {
        updateProgress(`Eliminando consulta ${done + 1} de ${patientRecords.length}…`);
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

      // Eliminar al paciente
      updateProgress("Eliminando datos del paciente…");
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

      // Actualizar estado local
      setPatients((prev) => prev.filter((p) => p.id !== deletePatientTarget.id));
      setRecords((prev) => prev.filter((r) => r.patient_id !== deletePatientTarget.id));
      setSelectedPatientId("");
    } finally {
      setDeleteProgress(null);
      setDeletePatientTarget(null);
    }
  }

  async function handleConfirmDeleteRecord() {
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

    setRecords((prev) => prev.filter((r) => r.id !== deleteRecordTarget.id));
    setDeleteRecordTarget(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (tenantLoading || loading) return <PacientesSkeleton />;

  return (
    <section className="hce-page">
      <header className="hce-surface">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="hce-page-header">
            <p className="hce-kicker">Historial de pacientes</p>
            <h1 className="hce-page-title">Pacientes</h1>
            <p className="hce-page-lead max-w-3xl">
              Aqui ves el historial de consultas y seguimientos por paciente. El alta de pacientes
              se hace desde Consultas para mantener un solo flujo de ingreso.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/consultas" className="hce-btn-primary">
              Crear consulta / paciente
            </Link>
            <Link href="/dashboard" className="hce-btn-secondary">
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="hce-alert-error" role="alert" aria-live="assertive">
          {error}
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
        />

        <section className="space-y-6">
          <PatientProfileCard
            patient={selectedPatient}
            patientHistory={patientHistory}
            statusSaving={statusSaving}
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
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteRecordTarget(null)}
        onConfirm={() => void handleConfirmDeleteRecord()}
      />
    </section>
  );
}
