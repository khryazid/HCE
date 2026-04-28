"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantProfile } from "@/lib/supabase/profile";
import { useClinicalContext } from "@/lib/context/clinical-context";
import { mergeCieCodeList } from "@/lib/ai/cie-suggestions";
import { fetchFirstCieSuggestionCode } from "@/lib/consultations/cie-suggestions-client";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import { searchCieCatalog } from "@/lib/constants/cie-catalog";
import { normalizeCommaValues } from "@/lib/consultations/workflow";
import {
  buildAutofillFormStatePatch,
  buildPendingFollowUp,
  buildTimelineRows,
  buildConsultaModeFormState,
  buildFollowUpFormState,
  listPatientRecordsByUpdatedAt,
  validateWizardForm,
  type WizardPendingFollowUp,
} from "@/lib/consultations/wizard-domain";
import { submitConsultationWithValidation } from "@/lib/consultations/wizard-submit";
import { type TreatmentTemplate } from "@/lib/local-data/treatments";
import { useWizardDraftSync } from "@/lib/consultations/use-wizard-draft-sync";
import { useWizardCieSuggestions } from "@/lib/consultations/use-wizard-cie-suggestions";
import { useFollowUpDeepLink } from "@/lib/consultations/use-follow-up-deeplink";
import { useConsultationBootstrapData } from "@/lib/consultations/use-consultation-bootstrap-data";
import { useConsultationSave } from "@/lib/consultations/use-consultation-save";
import { useConsultationPdfPreview } from "@/lib/consultations/use-consultation-pdf-preview";
import { useQuickPatientCreate } from "@/lib/consultations/use-quick-patient-create";
import { logApiError } from "@/lib/observability/error-logger";

export type WizardForm = {
  entryMode: "consulta" | "seguimiento";
  patientId: string;
  linkedRecordId: string;
  specialtyKind: "medicina-general" | "pediatria" | "odontologia";

  // Identificación extendida (Snapshots)
  gender: string;
  occupation: string;
  insurance: string;

  // Registro clínico
  chiefComplaint: string;
  anamnesis: string;
  symptoms: string; // Keep for backward compat
  medicalHistory: string;
  backgrounds: {
    pathological: string;
    surgical: string;
    allergic: string;
    pharmacological: string;
    family: string;
    toxic: string;
    gynecoObstetric: string;
  };
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
  };
  physicalExam: string;

  // Diagnóstico
  diagnosis: string;
  cieCodes: string;
  clinicalAnalysis: string;

  // Plan de Manejo
  treatmentTemplateId: string;
  treatmentPlan: string;
  recommendations: string;
  warningSigns: string;

  evolutionStatus: string;
  nextFollowUpDate: string;
};

const EMPTY_FORM: WizardForm = {
  entryMode: "consulta",
  patientId: "",
  linkedRecordId: "",
  specialtyKind: "medicina-general",
  gender: "",
  occupation: "",
  insurance: "",
  chiefComplaint: "",
  anamnesis: "",
  symptoms: "",
  medicalHistory: "",
  backgrounds: {
    pathological: "",
    surgical: "",
    allergic: "",
    pharmacological: "",
    family: "",
    toxic: "",
    gynecoObstetric: "",
  },
  vitalSigns: {
    bloodPressure: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
  },
  physicalExam: "",
  diagnosis: "",
  cieCodes: "",
  clinicalAnalysis: "",
  treatmentTemplateId: "",
  treatmentPlan: "",
  recommendations: "",
  warningSigns: "",
  evolutionStatus: "",
  nextFollowUpDate: "",
};

const EMPTY_QUICK_PATIENT = {
  documentNumber: "",
  firstName: "",
  lastName: "",
  birthDate: "",
};

export type QuickPatientForm = typeof EMPTY_QUICK_PATIENT;

export type PendingFollowUp = WizardPendingFollowUp;

export function useConsultationWizard(tenant: TenantProfile | null) {
  const router = useRouter();
  const deepLinkHandled = useRef(false);
  const draftRestored = useRef(false);
  const clinical = useClinicalContext();

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [records, setRecords] = useState<ClinicalRecordRecord[]>([]);
  const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<WizardForm>(EMPTY_FORM);

  const setForm = useMemo(() => {
    return (next: WizardForm | ((prev: WizardForm) => WizardForm)) => {
      setFormState((prev) => {
        const nextForm = typeof next === "function" ? next(prev) : next;

        // Auto-fill sincrónico al cambiar de paciente (evita useEffect cascade re-render)
        if (nextForm.patientId && nextForm.patientId !== prev.patientId) {
          // Si es una restauración de borrador, el draftDraftRestored maneja el estado
          if (draftRestored.current && clinical.wizardDraft?.patientId === nextForm.patientId) {
            return nextForm;
          }

          const latest = records
            .filter((r) => r.patient_id === nextForm.patientId)
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
          
          if (latest) {
            const patch = buildAutofillFormStatePatch(latest);
            return { ...nextForm, ...patch };
          }
        }
        return nextForm;
      });
    };
  }, [records, clinical.wizardDraft]);

  const form = formState;
  const [quickPatient, setQuickPatient] =
    useState<QuickPatientForm>(EMPTY_QUICK_PATIENT);
  const [selectedPatientTimelineId, setSelectedPatientTimelineId] =
    useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
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
    specialtyKind: form.specialtyKind,
  });

  // Auto-fill logic migrada al handler setForm para evitar re-renders en cascada.

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
      setPatients(nextPatients);
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

  const cieMatches = searchCieCatalog(
    [form.diagnosis, form.symptoms, form.anamnesis].filter(Boolean).join(" "),
  );

  const selectedCieCodes = normalizeCommaValues(form.cieCodes);

  useConsultationBootstrapData({
    tenant,
    setPatients,
    setRecords,
    setTemplates,
    setSelectedPatientTimelineId,
    setDataLoading,
    setError,
  });

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
    setForm((current) => ({
      ...current,
      patientId: current.patientId || "",
    }));
    setStep(1);
    setWizardOpen(true);
    setError(null);
    setMessage(null);
  }

  function applyTemplate(templateId: string) {
    setForm((current) => {
      const selected = templates.find((item) => item.id === templateId);
      return {
        ...current,
        treatmentTemplateId: templateId,
        treatmentPlan: selected ? selected.treatment : current.treatmentPlan,
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

    // NF-01: No intentar si estamos offline — el hook ya muestra catálogo local.
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
        setForm((current) => ({
          ...current,
          cieCodes: firstCode,
        }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido en sugerencia CIE";
      if (msg !== "CIE_UNAUTHORIZED") {
        // NF-02: Log estructurado — errores que no son de sesión se registran.
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
        buildPdfPreviewData,
        onSuccess: (nextRecords, successMessage) => {
          setRecords(nextRecords);
          resetWizard();
          setMessage(successMessage);
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
        onValidationFailed: () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
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
    cieMatches,
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

    // CIE
    cieSuggestions,
    cieSuggestionSource,
    cieSuggestionLoading,
    cieSuggestionError,

    // Actions
    openWizard,
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
