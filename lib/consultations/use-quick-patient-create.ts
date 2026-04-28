"use client";

/**
 * lib/consultations/use-quick-patient-create.ts
 *
 * Hook dedicado a la creación rápida de pacientes desde el wizard.
 * Extrae createQuickPatient del orquestador principal para separar
 * la responsabilidad de creación de datos del flujo del wizard.
 */

import { useCallback } from "react";
import { enqueueSyncItem, savePatientLocal } from "@/lib/db/indexeddb";
import { buildQuickPatientRecord } from "@/lib/consultations/wizard-domain";
import type { TenantProfile } from "@/lib/supabase/profile";
import type { PatientRecord } from "@/types/patient";
import type { QuickPatientForm } from "@/lib/consultations/use-consultation-wizard";

type Options = {
  tenant: TenantProfile | null;
  quickPatient: QuickPatientForm;
  patients: PatientRecord[];
  onSuccess: (nextPatients: PatientRecord[], newPatientId: string) => void;
  onError: (message: string) => void;
};

export function useQuickPatientCreate({
  tenant,
  quickPatient,
  patients,
  onSuccess,
  onError,
}: Options) {
  const createQuickPatient = useCallback(async () => {
    if (!tenant) return;

    if (
      !quickPatient.documentNumber.trim() ||
      !quickPatient.firstName.trim() ||
      !quickPatient.lastName.trim()
    ) {
      onError("Completa documento, nombre y apellido del paciente.");
      return;
    }

    const timestamp = new Date().toISOString();
    const patient = buildQuickPatientRecord(
      quickPatient,
      tenant,
      timestamp,
      crypto.randomUUID(),
    );

    await savePatientLocal(patient);
    await enqueueSyncItem({
      id: crypto.randomUUID(),
      table_name: "patients",
      record_id: patient.id,
      action: "insert",
      payload: patient,
      doctor_id: tenant.doctor_id,
      clinic_id: tenant.clinic_id,
      client_timestamp: Date.now(),
      status: "pending",
      retry_count: 0,
    });

    onSuccess([patient, ...patients], patient.id);
  }, [tenant, quickPatient, patients, onSuccess, onError]);

  return { createQuickPatient };
}
