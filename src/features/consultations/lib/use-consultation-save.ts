"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePdfWorker } from "@/features/consultations/lib/use-pdf-worker";
import {
  buildConsultationPayload,
} from "@/features/consultations/lib/wizard-payload";
import { persistConsultationLocally } from "@/features/consultations/lib/consultation-persistence";
import { buildLetterheadFromSession } from "@/features/dashboard/lib/letterhead";
import { getSupabaseClient } from "@/lib/supabase/client";
import { APP_EVENT_CONSULTATION_SAVED, emitAppEvent } from "@/lib/observability/app-events";
import { trackUsage } from "@/lib/observability/usage-tracker";
import type { TenantProfile } from "@/lib/supabase/profile";
import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import type { WizardPendingFollowUp } from "@/features/consultations/lib/wizard-domain";
import type { ConsultationPdfPreviewData } from "@/features/consultations/lib/pdf-preview";
import { recordKeys, patientKeys } from "@/features/patients/lib/use-patients-queries";
import type { PatientRecord, PatientStatus } from "@/features/patients/types";
import { updatePatientStatusLocal, enqueueSyncItem } from "@/lib/db/indexeddb";

type SaveConsultationOptions = {
  generatePdf?: boolean;
};

type SaveConsultationContext = {
  tenant: TenantProfile;
  form: WizardForm;
  pendingFollowUp: WizardPendingFollowUp | null;
  patients: PatientRecord[];
  buildPdfPreviewData: (timestamp: string) => ConsultationPdfPreviewData;
  onSuccess: (message: string) => void;
};

export function useConsultationSave() {
  const queryClient = useQueryClient();
  // A-18: PDF en Web Worker — no bloquea UI durante guardado
  const { generatePdfInWorker } = usePdfWorker();

  const saveMutation = useMutation({
    mutationFn: async ({
      options,
      context,
    }: {
      options: SaveConsultationOptions;
      context: SaveConsultationContext;
    }) => {
      const { tenant, form, pendingFollowUp, patients, buildPdfPreviewData } = context;

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
        // --- NUEVOS CAMPOS ---
        consultationType: form.consultationType,
        informantSource: form.informantSource,
        informantReliability: form.informantReliability,
        referringDoctor: form.referringDoctor,
        reviewOfSystems: form.reviewOfSystems,
        generalCondition: form.generalCondition,
        painScale: form.painScale,
        meanArterialPressure: form.vitalSigns.mean_arterial_pressure,
        currentMedications: form.currentMedications,
        soapSubjective: form.soapSubjective,
        soapObjective: form.soapObjective,
        soapAssessment: form.soapAssessment,
        soapPlan: form.soapPlan,
        prognosisVital: form.prognosisVital,
        prognosisFunctional: form.prognosisFunctional,
        pediatricData: form.pediatricData.headCircumference ? form.pediatricData : null,
        bloodType: form.blood_type || undefined,
        emergencyContact: form.emergency_contact.name ? form.emergency_contact : null,
        medicalOrders: (form.medical_orders.diet_type || form.medical_orders.general_measures || form.medical_orders.nursing_cares)
          ? form.medical_orders
          : null,
      });

      // --- Persistencia local + sync ---
      await persistConsultationLocally(
        { clinicId: tenant.clinic_id, doctorId: tenant.doctor_id },
        record,
        specialtyRow,
      );

      // --- Lab & Imaging Orders (100% Online) ---
      if (form.labOrders.length > 0 || form.imagingOrders.length > 0) {
        try {
          const supabase = getSupabaseClient();
          const ordersToInsert = [];
          
          if (form.labOrders.length > 0) {
            ordersToInsert.push({
              clinic_id: tenant.clinic_id,
              doctor_id: tenant.doctor_id,
              patient_id: form.patientId,
              clinical_record_id: recordId,
              order_type: "laboratory",
              items: form.labOrders.map(name => ({ name })),
              status: "pending"
            });
          }
          
          if (form.imagingOrders.length > 0) {
            ordersToInsert.push({
              clinic_id: tenant.clinic_id,
              doctor_id: tenant.doctor_id,
              patient_id: form.patientId,
              clinical_record_id: recordId,
              order_type: "imaging",
              items: form.imagingOrders.map(name => ({ name })),
              status: "pending"
            });
          }
          
          if (ordersToInsert.length > 0) {
            // Utilizamos 'as any' porque generamos tipos sin las migraciones locales en remoto
            const { error: ordersError } = await (supabase as any).from("lab_orders").insert(ordersToInsert as any);
            if (ordersError) console.error("Error al insertar órdenes:", ordersError);
          }
        } catch (err) {
          console.error("Fallo al guardar órdenes online (posible offline):", err);
        }
      }

      // --- Medical Referral (100% Online) ---
      if (form.medicalReferral) {
        try {
          const supabase = getSupabaseClient();
          const referralToInsert = {
            clinic_id: tenant.clinic_id,
            referring_doctor_id: tenant.doctor_id,
            patient_id: form.patientId,
            clinical_record_id: recordId,
            referred_doctor_id: form.medicalReferral.referred_doctor_id || null,
            external_doctor_name: form.medicalReferral.external_doctor_name || null,
            external_doctor_contact: form.medicalReferral.external_doctor_contact || null,
            reason: form.medicalReferral.reason,
            include_report: form.medicalReferral.include_report,
            status: "pending"
          };
          
          const { error: referralError } = await (supabase as any).from("medical_referrals").insert(referralToInsert as any);
          if (referralError) console.error("Error al insertar referencia:", referralError);
        } catch (err) {
          console.error("Fallo al guardar referencia online (posible offline):", err);
        }
      }

      // --- Update Patient Status ---
      const patient = patients.find(p => p.id === form.patientId);
      if (patient && patient.status !== form.patientStatus) {
        const nextStatus = form.patientStatus as PatientStatus;
        const updatedPatient = { ...patient, status: nextStatus, updated_at: timestamp };
        await updatePatientStatusLocal(patient.id, nextStatus);
        await enqueueSyncItem({
          id: crypto.randomUUID(),
          table_name: "patients",
          record_id: patient.id,
          action: "update",
          payload: updatedPatient,
          doctor_id: tenant.doctor_id,
          clinic_id: tenant.clinic_id,
          client_timestamp: Date.now(),
          status: "pending",
          retry_count: 0,
        });
      }

      // --- Marcar Cita como Completada (si existe) ---
      if (form.appointmentId) {
        const supabase = getSupabaseClient();
        await supabase
          .from("appointments")
          .update({ status: "completed", patient_id: form.patientId, updated_at: timestamp })
          .eq("id", form.appointmentId);
      }

      // --- PDF (opcional, en Web Worker) ---
      const shouldGeneratePdf = options.generatePdf ?? false;
      if (shouldGeneratePdf) {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const letterhead = buildLetterheadFromSession(
          tenant.doctor_id,
          tenant.clinic_id,
          session?.user?.user_metadata ?? {},
          tenant.specialties,
        );
        const pdfData = buildPdfPreviewData(timestamp);
        const patient = patients.find(p => p.id === form.patientId);
        const safeName = (patient?.full_name ?? "consulta")
          .replace(/[^a-zA-Z0-9]/g, "-")
          .replace(/-+/g, "-");
        const filename = `${safeName}-${patient?.document_number ?? "sin-doc"}.pdf`;
        // A-18: No await — PDF se genera en background, no bloquea el éxito del guardado
        void generatePdfInWorker(letterhead, pdfData, filename);
      }

      const patientName = patients.find(p => p.id === form.patientId)?.full_name ?? "paciente";
      const shortName = patientName.split(" ")[0]; // Solo el primer nombre

      const message = form.entryMode === "seguimiento"
        ? `Seguimiento de ${shortName} guardado correctamente${shouldGeneratePdf ? " · PDF generado" : ""}`
        : `Consulta de ${shortName} guardada${shouldGeneratePdf ? " · PDF generado" : ""}`;

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
      queryClient.invalidateQueries({ queryKey: patientKeys.tenant(context.tenant.clinic_id) });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      context.onSuccess(message);
    },
  });

  const saveConsultation = async (options: SaveConsultationOptions, context: SaveConsultationContext) => {
    return saveMutation.mutateAsync({ options, context });
  };

  return { saveConsultation };
}
