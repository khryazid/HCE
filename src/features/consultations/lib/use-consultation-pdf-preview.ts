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
} from "@/features/consultations/lib/pdf-preview";
import { formatDateTime } from "@/lib/ui/format-date";
import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import type { PatientRecord } from "@/features/patients/types";
import type { WizardPendingFollowUp } from "@/features/consultations/lib/wizard-domain";

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
      physicalExam: form.physicalExam
        .map((ex) => `**${ex.system.toUpperCase()}**\n${ex.content.trim()}`)
        .join("\n\n"),
      physicalExamStructured: form.physicalExam,
      diagnosis: form.diagnosis,
      cieCodes: form.cieCodes,
      clinicalAnalysis: form.clinicalAnalysis,
      treatmentPlan: finalTreatment,
      medicationInstructions: form.medicationInstructions,
      recommendations: form.recommendations,
      warningSigns: form.warningSigns,
      labOrders: form.labOrders.length > 0 ? form.labOrders : undefined,
      imagingOrders: form.imagingOrders.length > 0 ? form.imagingOrders : undefined,
      specialtyKind: form.specialtyKind,
      evolutionStatus: form.evolutionStatus || undefined,
      followUpDate: form.nextFollowUpDate || undefined,
      generalCondition: form.generalCondition || undefined,
      painScale: form.painScale,
      reviewOfSystems: form.reviewOfSystems,
      soapSubjective: form.soapSubjective || undefined,
      soapObjective: form.soapObjective || undefined,
      soapAssessment: form.soapAssessment || undefined,
      soapPlan: form.soapPlan || undefined,
      prognosisVital: form.prognosisVital || undefined,
      prognosisFunctional: form.prognosisFunctional || undefined,
    });
  }

  function getCurrentPdfPreviewData(): ConsultationPdfPreviewData | null {
    if (!form.patientId) return null;
    return buildPdfPreviewData(new Date().toISOString());
  }

  return { buildPdfPreviewData, getCurrentPdfPreviewData };
}
