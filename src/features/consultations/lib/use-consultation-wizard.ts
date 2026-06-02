"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { TenantProfile } from "@/lib/supabase/profile";
import { useClinicalContext } from "@/features/consultations/context/clinical-context";
import { mergeCieCodeList } from "@/features/consultations/lib/ai/cie-suggestions";
import { fetchFirstCieSuggestionCode } from "@/features/consultations/lib/cie-suggestions-client";
import type { ClinicalRecordRecord } from "@/features/consultations/types";

import { normalizeCommaValues } from "@/features/consultations/lib/workflow";
import {
  buildAutofillFormStatePatch,
  buildPendingFollowUp,
  buildTimelineRows,
  buildConsultaModeFormState,
  buildFollowUpFormState,
  listPatientRecordsByUpdatedAt,
  validateWizardForm,
  type WizardPendingFollowUp,
} from "@/features/consultations/lib/wizard-domain";
import { submitConsultationWithValidation } from "@/features/consultations/lib/wizard-submit";
import { useWizardDraftSync } from "@/features/consultations/lib/use-wizard-draft-sync";
import { useWizardCieSuggestions } from "@/features/consultations/lib/use-wizard-cie-suggestions";
import { useFollowUpDeepLink } from "@/features/consultations/lib/use-follow-up-deeplink";
import { useConsultationSave } from "@/features/consultations/lib/use-consultation-save";
import { useConsultationPdfPreview } from "@/features/consultations/lib/use-consultation-pdf-preview";
import { useQuickPatientCreate } from "@/features/consultations/lib/use-quick-patient-create";
import { logApiError } from "@/lib/observability/error-logger";
import { usePatients, useClinicalRecords, patientKeys } from "@/features/patients/lib/use-patients-queries";
import { usePatientsRealtime } from "@/features/patients/lib/use-patients-realtime";
import { useClinicalRecordsRealtime } from "@/features/patients/lib/use-clinical-records-realtime";
import { useTemplates, useClinicalFormTemplates } from "@/features/consultations/lib/use-consultation-queries";
import { useTemplatesRealtime } from "@/features/consultations/lib/use-templates-realtime";

import type {
  WizardForm,
  CurrentMedication,
  ReviewOfSystemEntry,
  QuickPatientForm,
  PendingFollowUp,
} from "./wizard-types";
import { EMPTY_FORM, EMPTY_QUICK_PATIENT } from "./wizard-constants";

export type {
  WizardForm,
  CurrentMedication,
  ReviewOfSystemEntry,
  QuickPatientForm,
  PendingFollowUp,
};

export function useConsultationWizard(tenant: TenantProfile | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draftRestored = useRef(false);
  const deepLinkHandled = useRef(false);
  const clinical = useClinicalContext();

  const { data: patients = [], isLoading: patientsLoading } = usePatients(tenant);
  const { data: records = [], isLoading: recordsLoading } = useClinicalRecords(tenant);
  const { data: templates = [], isLoading: templatesLoading } = useTemplates(tenant);
  const { data: formTemplates = [], isLoading: formTemplatesLoading } = useClinicalFormTemplates(tenant);

  // M-23: Suscripción en tiempo real a pacientes, consultas y plantillas
  usePatientsRealtime(tenant);
  useClinicalRecordsRealtime(tenant);
  useTemplatesRealtime(tenant);

  const dataLoading = patientsLoading || recordsLoading || templatesLoading || formTemplatesLoading;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<WizardForm>(() => ({
    ...EMPTY_FORM,
    specialtyKind: (tenant?.specialties?.[0] as WizardForm["specialtyKind"]) || "medicina-general"
  }));

  const [uiPreferences, setUiPreferences] = useState<Record<string, boolean>>(() => {
    return (tenant?.ui_preferences as Record<string, boolean>) || {};
  });

  const toggleSectionVisibility = useMemo(() => {
    return (sectionKey: string) => {
      setUiPreferences((prev) => {
        const next = { ...prev, [sectionKey]: prev[sectionKey] === false ? true : false };
        if (tenant?.doctor_id) {
          getSupabaseClient()
            .from("profiles")
            .update({ ui_preferences: next })
            .eq("doctor_id", tenant.doctor_id)
            .then(({ error }) => {
              if (error) console.error("Error saving UI preference:", error);
            });
        }
        return next;
      });
    };
  }, [tenant?.doctor_id]);

  const effectiveUiPreferences = useMemo(() => {
    // Si hay una plantilla de formulario activa, sobrescribe las preferencias
    if (formTemplates && formTemplates.length > 0) {
      const activeTemplate = formTemplates[0]; // Ya viene ordenada y filtrada por is_active
      const schema = (activeTemplate.schema as any[]) || [];
      const hasBlock = (type: string) => schema.some(b => b.type === type);
      
      return {
        ...uiPreferences,
        hide_vital_signs: !hasBlock("vital_signs"),
        hide_family_history: !hasBlock("family_history"),
        hide_personal_history: !hasBlock("personal_history"),
        hide_habits: !hasBlock("habits"),
        hide_female_history: !hasBlock("female_history"),
        hide_pediatric_history: !hasBlock("pediatric_history"),
        hide_review_of_systems: !hasBlock("review_of_systems"),
        hide_physical_exam: !hasBlock("physical_exam"),
        hide_diagnosis: !hasBlock("diagnosis"),
        hide_treatment_plan: !hasBlock("treatment_plan"),
        hide_medical_orders: !hasBlock("medical_orders"),
        hide_paraclinicals: !hasBlock("paraclinicals"),
      };
    }
    return uiPreferences;
  }, [formTemplates, uiPreferences]);

  // M-02: setForm estable — no cierra sobre `records` para evitar re-renders O(n)
  // en componentes hijos cada vez que cambia la lista de registros.
  const setForm = useCallback(
    (next: WizardForm | ((prev: WizardForm) => WizardForm)) => {
      setFormState(typeof next === "function" ? next : () => next);
    },
    [], // sin deps — referencia estable durante toda la vida del componente
  );

  // M-02: Auto-fill en useEffect independiente.
  // Dispara solo cuando form.patientId cambia, no en cada llamada a setForm.
  const prevAutoFillPatientId = useRef<string>("");
  useEffect(() => {
    const patientId = formState.patientId;
    if (!patientId || patientId === prevAutoFillPatientId.current) return;
    prevAutoFillPatientId.current = patientId;

    // Si es una restauración de borrador, el draft ya tiene los datos correctos
    if (draftRestored.current && clinical.wizardDraft?.patientId === patientId) return;

    const latest = records
      .filter((r) => r.patient_id === patientId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;

    if (latest) {
      const patch = buildAutofillFormStatePatch(latest);
      setFormState((prev) => ({ ...prev, ...patch }));
    }
  }, [formState.patientId, records, clinical.wizardDraft]);

  const form = formState;
  const [quickPatient, setQuickPatient] =
    useState<QuickPatientForm>(EMPTY_QUICK_PATIENT);
  const [selectedPatientTimelineId, setSelectedPatientTimelineId] =
    useState<string>(patients[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { saveConsultation: save } = useConsultationSave();

  useWizardDraftSync({
    dataLoading,
    wizardOpen,
    step,
    form,
    setForm: (next) => setForm(next),
    setStep: (next) => setStep(next),
    setWizardOpen: (next) => setWizardOpen(next),
    setMessage: (next) => setMessage(next),
    context: {
      wizardDraft: clinical.wizardDraft,
      wizardDraftOpen: clinical.wizardDraftOpen,
      wizardDraftStep: clinical.wizardDraftStep,
      saveWizardDraft: clinical.saveWizardDraft,
    },
    draftRestoredRef: draftRestored,
  });

  const {
    cieSuggestions,
    cieSuggestionSource,
    cieSuggestionLoading,
    cieSuggestionError,
    setCieSuggestionLoading,
  } = useWizardCieSuggestions({
    wizardOpen,
    step,
    diagnosis: form.diagnosis,
    symptoms: form.symptoms,
    anamnesis: form.anamnesis,
    // Usamos la especialidad REAL del médico (del perfil), no el tipo del formulario.
    // form.specialtyKind controla el sub-formulario clínico; este campo alimenta el prompt de Gemini.
    specialtyKind: tenant?.specialties?.join(", ") || form.specialtyKind,
  });

  // --- Derived state ---

  const selectedPatientRecords = useMemo(
    () => listPatientRecordsByUpdatedAt(records, form.patientId),
    [form.patientId, records],
  );

  const latestPatientRecord = selectedPatientRecords[0] ?? null;

  const pendingFollowUp = useMemo(
    (): WizardPendingFollowUp | null => buildPendingFollowUp(latestPatientRecord),
    [latestPatientRecord],
  );

  const { buildPdfPreviewData, getCurrentPdfPreviewData } = useConsultationPdfPreview({
    form,
    patients,
    pendingFollowUp,
  });

  const { createQuickPatient } = useQuickPatientCreate({
    tenant,
    quickPatient,
    patients,
    onSuccess: (nextPatients, newPatientId) => {
      queryClient.setQueryData(patientKeys.tenant(tenant!.clinic_id), nextPatients);
      setForm((current) => ({
        ...current,
        patientId: newPatientId,
        entryMode: "consulta",
        linkedRecordId: "",
      }));
      setQuickPatient(EMPTY_QUICK_PATIENT);
    },
    onError: (msg) => setError(msg),
  });

  const timelineRows = useMemo(
    () => buildTimelineRows(records, selectedPatientTimelineId, patients[0]?.id),
    [patients, records, selectedPatientTimelineId],
  );

  const selectedCieCodes = normalizeCommaValues(form.cieCodes);

  useFollowUpDeepLink({
    dataLoading,
    records,
    setForm,
    setStep,
    setWizardOpen,
    setError,
    setMessage,
    replaceRoute: router.replace,
    deepLinkHandledRef: deepLinkHandled,
  });

  // --- Actions ---

  function resetWizard() {
    setForm(EMPTY_FORM);
    setQuickPatient(EMPTY_QUICK_PATIENT);
    setStep(1);
    setWizardOpen(false);
    clinical.clearWizardDraft();
  }

  function openWizard() {
    const initialSpecialty = tenant?.specialties?.[0] ?? "medicina-general";
    setForm((current) => ({
      ...current,
      patientId: current.patientId || "",
      specialtyKind: initialSpecialty,
    }));
    setStep(1);
    setWizardOpen(true);
    setError(null);
    setMessage(null);
  }

  function resumeWizard() {
    setWizardOpen(true);
    setError(null);
    setMessage(null);
  }

  function applyTemplate(templateId: string) {
    setForm((current) => {
      const selected = templates.find((item) => item.id === templateId);
      if (!selected) return current;

      const extras = selected.extra_sections || {};
      
      return {
        ...current,
        treatmentTemplateId: templateId,
        treatmentPlan: selected.treatment,
        recommendations: extras.recommendations || current.recommendations,
        warningSigns: extras.warningSigns || current.warningSigns,
        labOrders: extras.labOrders || current.labOrders,
        imagingOrders: extras.imagingOrders || current.imagingOrders,
        medical_orders: {
          diet_type: extras.diet_type || current.medical_orders.diet_type,
          general_measures: extras.general_measures || current.medical_orders.general_measures,
          nursing_cares: extras.nursing_cares || current.medical_orders.nursing_cares,
        }
      };
    });
  }

  function applyFollowUpMode(record: ClinicalRecordRecord | null) {
    setForm((current) => buildFollowUpFormState(current, record));
  }

  function applyConsultaMode() {
    setForm((current) => buildConsultaModeFormState(current));
  }

  function applyCieSuggestion(code: string) {
    setForm((current) => ({
      ...current,
      cieCodes: mergeCieCodeList(current.cieCodes, code),
    }));
  }

  async function triggerMagicCieFill() {
    if (!form.diagnosis.trim()) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    try {
      setCieSuggestionLoading(true);
      const firstCode = await fetchFirstCieSuggestionCode({
        diagnosis: form.diagnosis,
        symptoms: form.symptoms,
        anamnesis: form.anamnesis,
        specialtyKind: form.specialtyKind,
      });

      if (firstCode) {
        // AUDIT FIX W-5: usar mergeCieCodeList para no destruir los códigos
        // CIE que el médico ya ingresó manualmente. La IA sugiere el primero
        // más relevante, pero se añade al conjunto existente.
        setForm((current) => ({
          ...current,
          cieCodes: mergeCieCodeList(current.cieCodes, firstCode),
        }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido en sugerencia CIE";
      if (msg !== "CIE_UNAUTHORIZED") {
        logApiError("triggerMagicCieFill", msg, { diagnosis: form.diagnosis });
      }
      setError(
        msg === "CIE_UNAUTHORIZED"
          ? "Tu sesión expiró para sugerencias asistidas. Vuelve a iniciar sesión."
          : null,
      );
    } finally {
      setCieSuggestionLoading(false);
    }
  }

  function validateAll(): Record<string, string> {
    return validateWizardForm({
      patientId: form.patientId,
      entryMode: form.entryMode,
      chiefComplaint: form.chiefComplaint,
      diagnosis: form.diagnosis,
      treatmentPlan: form.treatmentPlan,
      evolutionStatus: form.evolutionStatus,
    });
  }

  async function saveConsultation(options?: { generatePdf?: boolean }) {
    if (!tenant) {
      return;
    }

    await save(
      { generatePdf: options?.generatePdf ?? false },
      {
        tenant,
        form,
        pendingFollowUp,
        patients,
        buildPdfPreviewData,
        onSuccess: (_successMessage) => {
          const savedPatientId = form.patientId;
          router.push("/pacientes");
          // Set selected patient and reset wizard state
          // doing it after the push ensures smooth transition
          clinical.setSelectedPatientId(savedPatientId);
          setTimeout(() => resetWizard(), 100);
        },
      },
    );
  }

  async function submitConsultation(generatePdf: boolean) {
    await submitConsultationWithValidation(
      { generatePdf },
      {
        validate: validateAll,
        setValidationErrors,
        setError,
        setSaving,
        saveConsultation,
        onValidationFailed: (errors) => {
          const firstErrorKey = Object.keys(errors)[0];
          if (firstErrorKey) {
            const el = document.getElementById(`field-${firstErrorKey}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
      },
    );
  }

  async function handleSaveWithoutPdf() {
    await submitConsultation(false);
  }

  async function handleSaveWithPdf() {
    await submitConsultation(true);
  }

  return {
    // Data
    patients,
    records,
    templates,
    timelineRows,
    selectedCieCodes,

    // Wizard state
    wizardOpen,
    step,
    form,
    setForm,
    quickPatient,
    setQuickPatient,
    saving,
    dataLoading,
    error,
    message,
    validationErrors,

    // Derived
    latestPatientRecord,
    pendingFollowUp,
    selectedPatientTimelineId,
    setSelectedPatientTimelineId,
    uiPreferences: effectiveUiPreferences,
    toggleSectionVisibility,

    // CIE
    cieSuggestions,
    cieSuggestionSource,
    cieSuggestionLoading,
    cieSuggestionError,

    // Draft Support
    wizardDraft: clinical.wizardDraft,
    clearWizardDraft: clinical.clearWizardDraft,

    // Actions
    openWizard,
    resumeWizard,
    resetWizard,
    applyTemplate,
    createQuickPatient,
    applyFollowUpMode,
    applyConsultaMode,
    applyCieSuggestion,
    triggerMagicCieFill,
    handleSaveWithoutPdf,
    handleSaveWithPdf,
    getCurrentPdfPreviewData,
  };
}
