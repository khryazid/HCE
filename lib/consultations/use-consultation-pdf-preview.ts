"use client";

/**
 * lib/consultations/use-consultation-pdf-preview.ts
 *
 * Hook que construye el payload del PDF preview a partir del form del wizard.
 * Extrae buildPdfPreviewData y getCurrentPdfPreviewData del orquestador principal.
 */

import { useMemo } from "react";
import {
  buildConsultationPdfPreviewData,
  type ConsultationPdfPreviewData,
} from "@/lib/consultations/pdf-preview";
import { formatDateTime } from "@/lib/ui/format-date";
import type { WizardForm } from "@/lib/consultations/use-consultation-wizard";
import type { PatientRecord } from "@/types/patient";
import type { WizardPendingFollowUp } from "@/lib/consultations/wizard-domain";

type Options = {
  form: WizardForm;
  patients: PatientRecord[];
  pendingFollowUp: WizardPendingFollowUp | null;
};

export function useConsultationPdfPreview({ form, patients, pendingFollowUp }: Options) {
  const patient = useMemo(
    () => patients.find((p) => p.id === form.patientId) ?? null,
    [patients, form.patientId],
  );

  function buildPdfPreviewData(timestamp: string): ConsultationPdfPreviewData {
    const fallbackTreatment = pendingFollowUp?.treatmentPlan ?? "";
    const finalTreatment = form.treatmentPlan.trim() || fallbackTreatment;

    return buildConsultationPdfPreviewData({
      patientName: patient?.full_name ?? "Paciente",
      patientDocument: patient?.document_number ?? "sin-documento",
      birthDate: patient?.birth_date ?? undefined,
      consultationDate: formatDateTime(timestamp),
      gender: form.gender,
      occupation: form.occupation,
      insurance: form.insurance,
      chiefComplaint: form.chiefComplaint,
      anamnesis: form.anamnesis,
      medicalHistory: form.medicalHistory,
      backgrounds: form.backgrounds,
      vitalSigns: form.vitalSigns,
      physicalExam: form.physicalExam,
      diagnosis: form.diagnosis,
      cieCodes: form.cieCodes,
      clinicalAnalysis: form.clinicalAnalysis,
      treatmentPlan: finalTreatment,
      recommendations: form.recommendations,
      warningSigns: form.warningSigns,
      specialtyKind: form.specialtyKind,
      evolutionStatus: form.evolutionStatus || undefined,
      followUpDate: form.nextFollowUpDate || undefined,
    });
  }

  function getCurrentPdfPreviewData(): ConsultationPdfPreviewData | null {
    if (!form.patientId) return null;
    return buildPdfPreviewData(new Date().toISOString());
  }

  return { buildPdfPreviewData, getCurrentPdfPreviewData };
}
