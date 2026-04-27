"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantProfile } from "@/lib/supabase/profile";
import { useClinicalContext } from "@/lib/context/clinical-context";
import {
  enqueueSyncItem,
  listClinicalRecordsByTenant,
  savePatientLocal,
} from "@/lib/db/indexeddb";
import {
  mergeCieCodeList,
} from "@/lib/ai/cie-suggestions";
import {
  fetchFirstCieSuggestionCode,
} from "@/lib/consultations/cie-suggestions-client";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import { searchCieCatalog } from "@/lib/constants/cie-catalog";
import { generateConsultationPdf } from "@/lib/consultations/pdf";
import {
  ensureWizardStep,
  normalizeCommaValues,
} from "@/lib/consultations/workflow";
import {
  buildConsultationPdfPreviewData,
  type ConsultationPdfPreviewData,
} from "@/lib/consultations/pdf-preview";
import {
  buildAutofillFormStatePatch,
  buildPendingFollowUp,
  buildTimelineRows,
  buildConsultaModeFormState,
  buildFollowUpFormState,
  buildQuickPatientRecord,
  findLatestPatientRecord,
  listPatientRecordsByUpdatedAt,
  validateWizardForm,
  type WizardPendingFollowUp,
} from "@/lib/consultations/wizard-domain";
import {
  buildConsultationPayload,
  buildConsultationSuccessMessage,
} from "@/lib/consultations/wizard-payload";
import { persistConsultationLocally } from "@/lib/consultations/consultation-persistence";
import { submitConsultationWithValidation } from "@/lib/consultations/wizard-submit";
import { loadLetterheadSettings } from "@/lib/local-data/letterhead";
import {
  type TreatmentTemplate,
} from "@/lib/local-data/treatments";
import { APP_EVENT_CONSULTATION_SAVED, emitAppEvent } from "@/lib/observability/app-events";
import { useWizardDraftSync } from "@/lib/consultations/use-wizard-draft-sync";
import { useWizardCieSuggestions } from "@/lib/consultations/use-wizard-cie-suggestions";
import { useFollowUpDeepLink } from "@/lib/consultations/use-follow-up-deeplink";
import { useConsultationBootstrapData } from "@/lib/consultations/use-consultation-bootstrap-data";

function nowIso() {
  return new Date().toISOString();
}

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

export const EMPTY_FORM: WizardForm = {
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
  const [form, setForm] = useState<WizardForm>(EMPTY_FORM);
  const [quickPatient, setQuickPatient] =
    useState<QuickPatientForm>(EMPTY_QUICK_PATIENT);
  const [selectedPatientTimelineId, setSelectedPatientTimelineId] =
    useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  // --- Auto-fill previous data ---
  const autofillRef = useRef("");

  useEffect(() => {
    if (draftRestored.current && clinical.wizardDraft?.patientId === form.patientId) {
      // Si el borrador acaba de ser restaurado y coincide con el paciente actual, 
      // marcamos como "ya auto-llenado" para no sobreescribir el borrador con datos viejos.
      autofillRef.current = form.patientId;
    }

    if (form.patientId && autofillRef.current !== form.patientId) {
      const latest = findLatestPatientRecord(records, form.patientId);
      const patch = buildAutofillFormStatePatch(latest);

      setForm((current) => ({
        ...current,
        ...patch,
      }));
      autofillRef.current = form.patientId;
    } else if (!form.patientId) {
      autofillRef.current = "";
    }
  }, [form.patientId, records, clinical.wizardDraft]);

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

  async function createQuickPatient() {
    if (!tenant) {
      return;
    }

    if (!quickPatient.documentNumber.trim() || !quickPatient.firstName.trim() || !quickPatient.lastName.trim()) {
      setError("Completa documento, nombre y apellido del paciente.");
      return;
    }

    const timestamp = nowIso();
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

    const nextPatients = [patient, ...patients];
    setPatients(nextPatients);
    setForm((current) => ({
      ...current,
      patientId: patient.id,
      entryMode: "consulta",
      linkedRecordId: "",
    }));
    setQuickPatient(EMPTY_QUICK_PATIENT);
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
      // Falla en silencio (mágico)
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

  // No longer needed:
  // function nextStep() ...
  // function prevStep() ...

  function buildPdfPreviewData(timestamp: string): ConsultationPdfPreviewData {
    const fallbackTreatment = pendingFollowUp?.treatmentPlan || "";
    const finalTreatment = form.treatmentPlan.trim() || fallbackTreatment;
    const patient = patients.find((item) => item.id === form.patientId);

    return buildConsultationPdfPreviewData({
      patientName: patient?.full_name ?? "Paciente",
      patientDocument: patient?.document_number ?? "sin-documento",
      birthDate: patient?.birth_date ?? undefined,
      consultationDate: new Date(timestamp).toLocaleString("es-EC"),
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
    if (!form.patientId) {
      return null;
    }

    return buildPdfPreviewData(nowIso());
  }

  async function saveConsultation(options?: { generatePdf?: boolean }) {
    if (!tenant) {
      return;
    }

    if (!form.patientId) {
      throw new Error("Selecciona o crea un paciente antes de continuar.");
    }

    if (!form.anamnesis.trim() || !form.diagnosis.trim()) {
      throw new Error("Anamnesis y diagnostico son obligatorios.");
    }

    if (form.entryMode === "consulta" && !form.treatmentPlan.trim()) {
      throw new Error(
        "Debes definir un tratamiento para cerrar la consulta.",
      );
    }

    if (form.entryMode === "seguimiento" && !form.evolutionStatus.trim()) {
      throw new Error("Para seguimiento debes registrar la evolucion.");
    }

    const fallbackTreatment = pendingFollowUp?.treatmentPlan || "";

    const timestamp = nowIso();
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

    await persistConsultationLocally(
      {
        clinicId: tenant.clinic_id,
        doctorId: tenant.doctor_id,
      },
      record,
      specialtyRow,
    );

    const shouldGeneratePdf = options?.generatePdf ?? false;
    if (shouldGeneratePdf) {
      const letterhead = loadLetterheadSettings(
        tenant.doctor_id,
        tenant.clinic_id,
      );
      generateConsultationPdf(letterhead, buildPdfPreviewData(timestamp));
    }

    const nextRecords = await listClinicalRecordsByTenant(
      tenant.doctor_id,
      tenant.clinic_id,
    );
    setRecords(nextRecords);
    resetWizard();
    setMessage(
      buildConsultationSuccessMessage({
        entryMode: form.entryMode,
        generatedPdf: shouldGeneratePdf,
      }),
    );

    emitAppEvent(APP_EVENT_CONSULTATION_SAVED, {
      recordId: record.id,
      specialtyKind: form.specialtyKind,
      entryMode: form.entryMode,
      generatedPdf: shouldGeneratePdf,
    });
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
