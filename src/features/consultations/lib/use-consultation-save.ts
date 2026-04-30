"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateConsultationPdf } from "@/features/consultations/lib/pdf";
import {
  buildConsultationPayload,
  buildConsultationSuccessMessage,
} from "@/features/consultations/lib/wizard-payload";
import { persistConsultationLocally } from "@/features/consultations/lib/consultation-persistence";
import { loadLetterheadSettings } from "@/features/dashboard/lib/letterhead";
import { APP_EVENT_CONSULTATION_SAVED, emitAppEvent } from "@/lib/observability/app-events";
import { trackUsage } from "@/lib/observability/usage-tracker";
import type { TenantProfile } from "@/lib/supabase/profile";
import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import type { WizardPendingFollowUp } from "@/features/consultations/lib/wizard-domain";
import type { ConsultationPdfPreviewData } from "@/features/consultations/lib/pdf-preview";
import { recordKeys } from "@/features/patients/lib/use-patients-queries";

type SaveConsultationOptions = {
  generatePdf?: boolean;
};

type SaveConsultationContext = {
  tenant: TenantProfile;
  form: WizardForm;
  pendingFollowUp: WizardPendingFollowUp | null;
  buildPdfPreviewData: (timestamp: string) => ConsultationPdfPreviewData;
  onSuccess: (message: string) => void;
};

export function useConsultationSave() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async ({
      options,
      context,
    }: {
      options: SaveConsultationOptions;
      context: SaveConsultationContext;
    }) => {
      const { tenant, form, pendingFollowUp, buildPdfPreviewData } = context;

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
        labOrders: form.labOrders,
        imagingOrders: form.imagingOrders,
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
        await generateConsultationPdf(letterhead, buildPdfPreviewData(timestamp));
      }

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

      return message;
    },
    onSuccess: (message, { context }) => {
      queryClient.invalidateQueries({ queryKey: recordKeys.tenant(context.tenant.clinic_id) });
      context.onSuccess(message);
    },
  });

  const saveConsultation = async (options: SaveConsultationOptions, context: SaveConsultationContext) => {
    return saveMutation.mutateAsync({ options, context });
  };

  return { saveConsultation };
}
