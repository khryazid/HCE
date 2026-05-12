"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { TenantProfile } from "@/lib/supabase/profile";
import { useClinicalContext } from "@/features/consultations/context/clinical-context";
import { mergeCieCodeList } from "@/features/consultations/lib/ai/cie-suggestions";
import { fetchFirstCieSuggestionCode } from "@/features/consultations/lib/cie-suggestions-client";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { MedInstruction } from "@/features/consultations/components/medication-instructions-builder";

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
import { useTemplates } from "@/features/consultations/lib/use-consultation-queries";

export type CurrentMedication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  since: string;
};

export type ReviewOfSystemEntry = { present: boolean; notes: string };

export type WizardForm = {
  entryMode: "consulta" | "seguimiento";
  patientId: string;
  linkedRecordId: string;
  specialtyKind: string;
  patientStatus: "activo" | "inactivo" | "en-seguimiento" | "alta";

  // Identificación extendida (Snapshots) — Tarea 2
  /** Sexo biológico. Clínicamente binario; requerido para valores de referencia de laboratorio. */
  gender: "Hombre" | "Mujer" | "";
  occupation: string;
  insurance: string;
  /** Tipo de sangre (ABO + Rh). */
  blood_type: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
  /** Contacto de emergencia. */
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };

  // --- Datos de Ingreso ---
  consultationType: "primera-vez" | "control" | "urgencia" | "interconsulta";
  informantSource: "paciente" | "familiar" | "expediente" | "otro";
  informantReliability: "confiable" | "parcialmente-confiable" | "no-confiable";
  referringDoctor: string;

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

  // --- Revisión por Sistemas ---
  reviewOfSystems: {
    cardiovascular: ReviewOfSystemEntry;
    respiratory: ReviewOfSystemEntry;
    gastrointestinal: ReviewOfSystemEntry;
    genitourinary: ReviewOfSystemEntry;
    neurological: ReviewOfSystemEntry;
    musculoskeletal: ReviewOfSystemEntry;
    dermatological: ReviewOfSystemEntry;
    endocrine: ReviewOfSystemEntry;
    psychiatric: ReviewOfSystemEntry;
    hematological: ReviewOfSystemEntry;
  };

  // --- Examen Físico (Paso 4) ---
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
    /** PAM calculada automáticamente: (sistólica + 2*diastólica) / 3. Solo lectura. */
    mean_arterial_pressure: string;
  };
  physicalExam: { system: string; content: string }[];
  generalCondition: string;
  painScale: number | null;

  // --- Diagnóstico (Paso 5) ---
  diagnosis: string;
  cieCodes: string;
  clinicalAnalysis: string;

  // --- Plan de Manejo (Paso 6) ---
  /** Órdenes Intrahospitalarias / Medidas Generales — Tarea 5. */
  medical_orders: {
    diet_type: string;
    general_measures: string;
    nursing_cares: string;
  };
  treatmentTemplateId: string;
  treatmentPlan: string;
  /** Instrucciones de uso para el paciente (no para la farmacia). Se imprime en la hoja del paciente. */
  medicationInstructions: string;
  recommendations: string;
  warningSigns: string;
  /** Órdenes de laboratorio seleccionadas o escritas manualmente. */
  labOrders: string[];
  /** Estudios de imagen solicitados (Rx, TAC, RM, etc.). */
  imagingOrders: string[];

  // --- Medicamentos estructurados ---
  currentMedications: CurrentMedication[];
  /** Instrucciones de posología estructuradas por medicamento (se serializa en specialty_data) */
  medicationInstructionsStructured: MedInstruction[];

  evolutionStatus: string;
  nextFollowUpDate: string;

  // --- SOAP para seguimientos ---
  soapSubjective: string;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;

  // --- Pronóstico ---
  prognosisVital: "bueno" | "reservado" | "malo" | "";
  prognosisFunctional: "bueno" | "reservado" | "malo" | "";

  // --- Datos pediátricos ---
  pediatricData: {
    headCircumference: string;
    developmentStage: string;
    vaccineStatus: string;
  };
};

const EMPTY_FORM: WizardForm = {
  entryMode: "consulta",
  patientId: "",
  linkedRecordId: "",
  specialtyKind: "medicina-general",
  patientStatus: "activo",
  gender: "",
  occupation: "",
  insurance: "",
  blood_type: "",
  emergency_contact: { name: "", relationship: "", phone: "" },
  consultationType: "primera-vez",
  informantSource: "paciente",
  informantReliability: "confiable",
  referringDoctor: "",
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
  reviewOfSystems: {
    cardiovascular: { present: false, notes: "" },
    respiratory: { present: false, notes: "" },
    gastrointestinal: { present: false, notes: "" },
    genitourinary: { present: false, notes: "" },
    neurological: { present: false, notes: "" },
    musculoskeletal: { present: false, notes: "" },
    dermatological: { present: false, notes: "" },
    endocrine: { present: false, notes: "" },
    psychiatric: { present: false, notes: "" },
    hematological: { present: false, notes: "" },
  },
  vitalSigns: {
    bloodPressure: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    mean_arterial_pressure: "",
  },
  physicalExam: [],
  generalCondition: "",
  painScale: null,
  diagnosis: "",
  cieCodes: "",
  clinicalAnalysis: "",
  medical_orders: { diet_type: "", general_measures: "", nursing_cares: "" },
  treatmentTemplateId: "",
  treatmentPlan: "",
  medicationInstructions: "",
  recommendations: "",
  warningSigns: "",
  labOrders: [],
  imagingOrders: [],
  currentMedications: [],
  medicationInstructionsStructured: [],
  evolutionStatus: "",
  nextFollowUpDate: "",
  soapSubjective: "",
  soapObjective: "",
  soapAssessment: "",
  soapPlan: "",
  prognosisVital: "",
  prognosisFunctional: "",
  pediatricData: {
    headCircumference: "",
    developmentStage: "",
    vaccineStatus: "",
  },
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
  const queryClient = useQueryClient();
  const deepLinkHandled = useRef(false);
  const draftRestored = useRef(false);
  const clinical = useClinicalContext();

  const { data: patients = [], isLoading: patientsLoading } = usePatients(tenant);
  const { data: records = [], isLoading: recordsLoading } = useClinicalRecords(tenant);
  const { data: templates = [], isLoading: templatesLoading } = useTemplates(tenant);

  const dataLoading = patientsLoading || recordsLoading || templatesLoading;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<WizardForm>(() => ({
    ...EMPTY_FORM,
    specialtyKind: (tenant?.specialties?.[0] as WizardForm["specialtyKind"]) || "medicina-general"
  }));

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
        onSuccess: (successMessage) => {
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
