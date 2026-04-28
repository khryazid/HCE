"use client";

import { useCallback } from "react";
import { listClinicalRecordsByTenant } from "@/lib/db/indexeddb";
import { generateConsultationPdf } from "@/lib/consultations/pdf";
import {
  buildConsultationPayload,
  buildConsultationSuccessMessage,
} from "@/lib/consultations/wizard-payload";
import { persistConsultationLocally } from "@/lib/consultations/consultation-persistence";
import { loadLetterheadSettings } from "@/lib/local-data/letterhead";
import { APP_EVENT_CONSULTATION_SAVED, emitAppEvent } from "@/lib/observability/app-events";
import { trackUsage } from "@/lib/observability/usage-tracker";
import type { TenantProfile } from "@/lib/supabase/profile";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { WizardForm } from "@/lib/consultations/use-consultation-wizard";
import type { WizardPendingFollowUp } from "@/lib/consultations/wizard-domain";
import type { ConsultationPdfPreviewData } from "@/lib/consultations/pdf-preview";

type SaveConsultationOptions = {
  generatePdf?: boolean;
};

type SaveConsultationContext = {
  tenant: TenantProfile;
  form: WizardForm;
  pendingFollowUp: WizardPendingFollowUp | null;
  buildPdfPreviewData: (timestamp: string) => ConsultationPdfPreviewData;
  onSuccess: (nextRecords: ClinicalRecordRecord[], message: string) => void;
};

/**
 * useConsultationSave
 *
 * Hook dedicado al guardado de una consulta clínica.
 * Extrae toda la lógica de persistencia, PDF y eventos del hook orquestador
 * principal (useConsultationWizard) para mantener responsabilidades claras.
 *
 * Responsabilidades:
 * - Validaciones de negocio pre-guardado.
 * - Construcción del payload clínico.
 * - Persistencia local + encolado de sync.
 * - Generación de PDF (opcional).
 * - Re-carga de registros post-guardado.
 * - Emisión del evento de auditoría.
 */
export function useConsultationSave() {
  const saveConsultation = useCallback(
    async (
      options: SaveConsultationOptions,
      context: SaveConsultationContext,
    ) => {
      const { tenant, form, pendingFollowUp, buildPdfPreviewData, onSuccess } = context;

      // --- Validaciones de negocio ---
      if (!form.patientId) {
        throw new Error("Selecciona o crea un paciente antes de continuar.");
      }

      if (!form.anamnesis.trim() || !form.diagnosis.trim()) {
        throw new Error("Anamnesis y diagnostico son obligatorios.");
      }

      if (form.entryMode === "consulta" && !form.treatmentPlan.trim()) {
        throw new Error("Debes definir un tratamiento para cerrar la consulta.");
      }

      if (form.entryMode === "seguimiento" && !form.evolutionStatus.trim()) {
        throw new Error("Para seguimiento debes registrar la evolucion.");
      }

      // --- Construcción del payload ---
      const fallbackTreatment = pendingFollowUp?.treatmentPlan ?? "";
      const timestamp = new Date().toISOString();
      const recordId = crypto.randomUUID();
      const specialtyId = crypto.randomUUID();

      const { record, specialtyRow } = buildConsultationPayload({
        tenant: {
          clinicId: tenant.clinic_id,
          doctorId: tenant.doctor_id,
        },
        patientId: form.patientId,
        specialtyKind: form.specialtyKind,
        entryMode: form.entryMode,
        linkedRecordId: form.linkedRecordId,
        chiefComplaint: form.chiefComplaint,
        anamnesis: form.anamnesis,
        symptoms: form.symptoms,
        medicalHistory: form.medicalHistory,
        backgrounds: form.backgrounds,
        vitalSigns: form.vitalSigns,
        physicalExam: form.physicalExam,
        diagnosis: form.diagnosis,
        clinicalAnalysis: form.clinicalAnalysis,
        treatmentTemplateId: form.treatmentTemplateId,
        treatmentPlan: form.treatmentPlan,
        recommendations: form.recommendations,
        warningSigns: form.warningSigns,
        evolutionStatus: form.evolutionStatus,
        nextFollowUpDate: form.nextFollowUpDate,
        patientSnapshot: {
          gender: form.gender,
          occupation: form.occupation,
          insurance: form.insurance,
        },
        fallbackTreatmentPlan: fallbackTreatment,
        timestamp,
        recordId,
        specialtyId,
        cieCodes: form.cieCodes,
      });

      // --- Persistencia local + sync ---
      await persistConsultationLocally(
        { clinicId: tenant.clinic_id, doctorId: tenant.doctor_id },
        record,
        specialtyRow,
      );

      // --- PDF (opcional) ---
      const shouldGeneratePdf = options.generatePdf ?? false;
      if (shouldGeneratePdf) {
        const letterhead = loadLetterheadSettings(tenant.doctor_id, tenant.clinic_id);
        generateConsultationPdf(letterhead, buildPdfPreviewData(timestamp));
      }

      // --- Post-guardado ---
      const nextRecords = await listClinicalRecordsByTenant(
        tenant.doctor_id,
        tenant.clinic_id,
      );

      const message = buildConsultationSuccessMessage({
        entryMode: form.entryMode,
        generatedPdf: shouldGeneratePdf,
      });

      // Evento de auditoría / observabilidad
      emitAppEvent(APP_EVENT_CONSULTATION_SAVED, {
        recordId: record.id,
        specialtyKind: form.specialtyKind,
        entryMode: form.entryMode,
        generatedPdf: shouldGeneratePdf,
      });

      trackUsage("consultation:save");
      if (shouldGeneratePdf) {
        trackUsage("pdf:generate");
      }

      onSuccess(nextRecords, message);
    },
    [],
  );

  return { saveConsultation };
}
