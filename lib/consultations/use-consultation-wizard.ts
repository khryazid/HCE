"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantProfile } from "@/lib/supabase/profile";
import { useClinicalContext } from "@/lib/context/clinical-context";
import {
  enqueueSyncItem,
  listClinicalRecordsByTenant,
  listPatientsByTenant,
  saveClinicalRecordLocal,
  savePatientLocal,
  saveSpecialtyDataLocal,
} from "@/lib/db/indexeddb";
import {
  mergeCieCodeList,
  type CieSuggestion,
  type CieSuggestionSource,
} from "@/lib/ai/cie-suggestions";
import type {
  ClinicalRecordRecord,
  SpecialtyDataRow,
} from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import { searchCieCatalog } from "@/lib/constants/cie-catalog";
import { generateConsultationPdf } from "@/lib/consultations/pdf";
import {
  ensureWizardStep,
  normalizeCommaValues,
} from "@/lib/consultations/workflow";
import { loadLetterheadSettings } from "@/lib/local-data/letterhead";
import {
  listTreatmentTemplates,
  type TreatmentTemplate,
} from "@/lib/local-data/treatments";
import { getSupabaseClient } from "@/lib/supabase/client";

function nowIso() {
  return new Date().toISOString();
}

export type WizardForm = {
  entryMode: "consulta" | "seguimiento";
  patientId: string;
  linkedRecordId: string;
  anamnesis: string;
  symptoms: string;
  diagnosis: string;
  cieCodes: string;
  specialtyKind: "medicina-general" | "pediatria" | "odontologia";
  treatmentTemplateId: string;
  treatmentPlan: string;
  evolutionStatus: string;
  nextFollowUpDate: string;
};

export const EMPTY_FORM: WizardForm = {
  entryMode: "consulta",
  patientId: "",
  linkedRecordId: "",
  anamnesis: "",
  symptoms: "",
  diagnosis: "",
  cieCodes: "",
  specialtyKind: "medicina-general",
  treatmentTemplateId: "",
  treatmentPlan: "",
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

export type PendingFollowUp = {
  recordId: string;
  dueDateRaw: string;
  dueDateLabel: string;
  isOverdue: boolean;
  diagnosis: string;
  treatmentPlan: string;
};

export type ConsultationPdfPreviewData = {
  patientName: string;
  patientDocument: string;
  consultationDate: string;
  anamnesis: string;
  symptoms: string;
  diagnosis: string;
  cieCodes: string[];
  treatmentPlan: string;
  specialtyKind: string;
  evolutionStatus?: string;
  followUpDate?: string;
};

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
  const [cieSuggestions, setCieSuggestions] = useState<CieSuggestion[]>([]);
  const [cieSuggestionSource, setCieSuggestionSource] =
    useState<CieSuggestionSource>("catalog");
  const [cieSuggestionLoading, setCieSuggestionLoading] = useState(false);
  const [cieSuggestionError, setCieSuggestionError] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // --- Restore draft from ClinicalContext on mount ---

  useEffect(() => {
    if (draftRestored.current || dataLoading) {
      return;
    }
    draftRestored.current = true;

    if (clinical.wizardDraft && clinical.wizardDraftOpen) {
      setForm(clinical.wizardDraft);
      setStep(clinical.wizardDraftStep);
      setWizardOpen(true);
      setMessage("Borrador de consulta restaurado.");
    }
  }, [clinical.wizardDraft, clinical.wizardDraftOpen, clinical.wizardDraftStep, dataLoading]);

  // --- Auto-save draft to ClinicalContext when wizard changes ---

  const formRef = useRef(form);
  const stepRef = useRef(step);
  const wizardOpenRef = useRef(wizardOpen);
  formRef.current = form;
  stepRef.current = step;
  wizardOpenRef.current = wizardOpen;

  useEffect(() => {
    if (!wizardOpenRef.current || !draftRestored.current) {
      return;
    }

    const timer = setTimeout(() => {
      clinical.saveWizardDraft(formRef.current, stepRef.current);
    }, 300);

    return () => clearTimeout(timer);
    // Only re-run when form or step actually change (primitive/reference equality)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, wizardOpen]);

  // --- Derived state ---

  const selectedPatientRecords = useMemo(() => {
    if (!form.patientId) {
      return [] as ClinicalRecordRecord[];
    }

    return records
      .filter((record) => record.patient_id === form.patientId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [form.patientId, records]);

  const latestPatientRecord = selectedPatientRecords[0] ?? null;

  const pendingFollowUp = useMemo((): PendingFollowUp | null => {
    if (!latestPatientRecord) {
      return null;
    }

    const data = latestPatientRecord.specialty_data as Record<string, unknown>;
    const dueDateRaw =
      typeof data.next_follow_up_date === "string"
        ? data.next_follow_up_date
        : null;
    if (!dueDateRaw) {
      return null;
    }

    const dueDate = new Date(dueDateRaw);
    if (Number.isNaN(dueDate.getTime())) {
      return null;
    }

    const diagnosis =
      typeof data.diagnosis === "string" && data.diagnosis.trim().length > 0
        ? data.diagnosis
        : latestPatientRecord.chief_complaint;

    return {
      recordId: latestPatientRecord.id,
      dueDateRaw,
      dueDateLabel: dueDate.toLocaleDateString("es-EC"),
      isOverdue: dueDate.getTime() < Date.now(),
      diagnosis,
      treatmentPlan:
        typeof data.treatment_plan === "string" &&
        data.treatment_plan.trim().length > 0
          ? data.treatment_plan
          : "",
    };
  }, [latestPatientRecord]);

  const timelineRows = useMemo(() => {
    const targetPatientId = selectedPatientTimelineId || patients[0]?.id;
    if (!targetPatientId) {
      return [];
    }

    return records
      .filter((record) => record.patient_id === targetPatientId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [patients, records, selectedPatientTimelineId]);

  const cieMatches = searchCieCatalog(
    [form.diagnosis, form.symptoms, form.anamnesis].filter(Boolean).join(" "),
  );

  const selectedCieCodes = normalizeCommaValues(form.cieCodes);

  // --- Bootstrap data when tenant loads ---

  useEffect(() => {
    if (!tenant) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const [patientRows, consultationRows] = await Promise.all([
          listPatientsByTenant(tenant.clinic_id),
          listClinicalRecordsByTenant(tenant.doctor_id, tenant.clinic_id),
        ]);

        if (!active) {
          return;
        }

        setPatients(patientRows);
        setRecords(consultationRows);
        setTemplates(
          listTreatmentTemplates(tenant.doctor_id, tenant.clinic_id),
        );
        setSelectedPatientTimelineId(patientRows[0]?.id ?? "");
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar consultas.",
          );
        }
      } finally {
        if (active) {
          setDataLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [tenant]);

  // --- Deep-link handling ---

  useEffect(() => {
    if (dataLoading || deepLinkHandled.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    const mode = urlParams.get("mode");
    const patientId = urlParams.get("patientId");
    const recordId = urlParams.get("recordId");

    if (mode !== "seguimiento" || !patientId || !recordId) {
      return;
    }

    const linkedRecord = records.find(
      (record) => record.id === recordId && record.patient_id === patientId,
    );

    if (!linkedRecord) {
      deepLinkHandled.current = true;
      return;
    }

    const data = linkedRecord.specialty_data as Record<string, unknown>;
    const prevDiagnosis =
      typeof data.diagnosis === "string" ? data.diagnosis : "";
    const prevSymptoms =
      typeof data.symptoms === "string" ? data.symptoms : "";
    const prevTreatment =
      typeof data.treatment_plan === "string" ? data.treatment_plan : "";

    setForm((current) => ({
      ...current,
      entryMode: "seguimiento",
      patientId,
      linkedRecordId: linkedRecord.id,
      diagnosis: prevDiagnosis,
      symptoms: prevSymptoms,
      anamnesis: `Seguimiento de ${prevDiagnosis || "consulta previa"}`,
      treatmentPlan: prevTreatment,
      cieCodes: linkedRecord.cie_codes.join(", "),
      specialtyKind: linkedRecord.specialty_kind,
    }));
    setStep(2);
    setWizardOpen(true);
    setError(null);
    setMessage("Seguimiento precargado desde historial.");
    deepLinkHandled.current = true;
    router.replace("/consultas");
  }, [dataLoading, records, router]);

  // --- CIE suggestion effect ---

  useEffect(() => {
    if (!wizardOpen || step !== 2) {
      setCieSuggestions([]);
      setCieSuggestionSource("catalog");
      setCieSuggestionLoading(false);
      setCieSuggestionError(null);
      return;
    }

    const query = [form.diagnosis, form.symptoms, form.anamnesis]
      .filter(Boolean)
      .join(" ")
      .trim();
    const localMatches = searchCieCatalog(query).slice(0, 5);

    if (!query) {
      setCieSuggestions([]);
      setCieSuggestionSource("catalog");
      setCieSuggestionLoading(false);
      setCieSuggestionError(null);
      return;
    }

    setCieSuggestions(
      localMatches.map((entry, index) => ({
        code: entry.code,
        description: entry.description,
        rationale: "Coincidencia del catalogo local.",
        confidence: Math.max(0.55, 0.9 - index * 0.08),
        source: "catalog",
      })),
    );
    setCieSuggestionSource("catalog");
    setCieSuggestionError(null);

    if (query.length < 6) {
      setCieSuggestionLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setCieSuggestionLoading(true);

      const supabase = getSupabaseClient();

      void supabase.auth
        .getSession()
        .then(({ data }) => {
          const accessToken = data.session?.access_token;

          return fetch("/api/cie-suggestions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken
                ? {
                    Authorization: `Bearer ${accessToken}`,
                  }
                : {}),
            },
            body: JSON.stringify({
              diagnosis: form.diagnosis,
              symptoms: form.symptoms,
              anamnesis: form.anamnesis,
              specialtyKind: form.specialtyKind,
            }),
            signal: controller.signal,
          });
        })
        .then(async (response) => {
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("CIE_UNAUTHORIZED");
            }

            throw new Error("No se pudo consultar sugerencias CIE.");
          }

          const data = (await response.json()) as {
            source?: CieSuggestionSource;
            suggestions?: CieSuggestion[];
          };

          if (controller.signal.aborted) {
            return;
          }

          if (
            Array.isArray(data.suggestions) &&
            data.suggestions.length > 0
          ) {
            setCieSuggestions(data.suggestions);
            setCieSuggestionSource(data.source ?? "catalog");
            setCieSuggestionError(null);
          }
        })
        .catch((requestError: unknown) => {
          if (!controller.signal.aborted) {
            if (
              requestError instanceof Error &&
              requestError.message === "CIE_UNAUTHORIZED"
            ) {
              setCieSuggestionError(
                "Tu sesion expiro para sugerencias asistidas. Vuelve a iniciar sesion para usar Gemini.",
              );
              return;
            }

            setCieSuggestionError(
              "La sugerencia asistida no estuvo disponible; se conservan coincidencias locales.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setCieSuggestionLoading(false);
          }
        });
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    form.anamnesis,
    form.diagnosis,
    form.specialtyKind,
    form.symptoms,
    step,
    wizardOpen,
  ]);

  // --- Actions ---

  function resetWizard() {
    setForm(EMPTY_FORM);
    setQuickPatient(EMPTY_QUICK_PATIENT);
    setStep(1);
    setWizardOpen(false);
    setCieSuggestions([]);
    setCieSuggestionSource("catalog");
    setCieSuggestionLoading(false);
    setCieSuggestionError(null);
    clinical.clearWizardDraft();
  }

  function openWizard() {
    setForm((current) => ({
      ...current,
      patientId: current.patientId || patients[0]?.id || "",
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
      throw new Error("Completa documento, nombre y apellido del paciente.");
    }

    const fullName = `${quickPatient.firstName.trim()} ${quickPatient.lastName.trim()}`;

    const timestamp = nowIso();
    const patient: PatientRecord = {
      id: crypto.randomUUID(),
      clinic_id: tenant.clinic_id,
      doctor_id: tenant.doctor_id,
      document_number: quickPatient.documentNumber.trim(),
      full_name: fullName,
      birth_date: quickPatient.birthDate ? quickPatient.birthDate : null,
      status: "activo",
      created_at: timestamp,
      updated_at: timestamp,
    };

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
    if (!record) {
      setForm((current) => ({
        ...current,
        entryMode: "seguimiento",
      }));
      return;
    }

    const data = record.specialty_data as Record<string, unknown>;
    const prevDiagnosis =
      typeof data.diagnosis === "string" ? data.diagnosis : "";
    const prevSymptoms =
      typeof data.symptoms === "string" ? data.symptoms : "";
    const prevTreatment =
      typeof data.treatment_plan === "string" ? data.treatment_plan : "";

    setForm((current) => ({
      ...current,
      entryMode: "seguimiento",
      linkedRecordId: record.id,
      diagnosis: current.diagnosis || prevDiagnosis,
      symptoms: current.symptoms || prevSymptoms,
      anamnesis:
        current.anamnesis ||
        `Seguimiento de ${prevDiagnosis || "consulta previa"}`,
      treatmentPlan: current.treatmentPlan || prevTreatment,
      cieCodes: current.cieCodes || record.cie_codes.join(", "),
    }));
  }

  function applyConsultaMode() {
    setForm((current) => ({
      ...current,
      entryMode: "consulta",
      linkedRecordId: "",
    }));
  }

  function applyCieSuggestion(code: string) {
    setForm((current) => ({
      ...current,
      cieCodes: mergeCieCodeList(current.cieCodes, code),
    }));
  }

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function validateStep(stepNumber: number): Record<string, string> {
    const errors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!form.patientId) {
        errors.patientId = "Selecciona o crea un paciente.";
      }
    }

    if (stepNumber === 2) {
      if (!form.anamnesis.trim()) {
        errors.anamnesis = "La anamnesis es obligatoria.";
      }
      if (!form.diagnosis.trim()) {
        errors.diagnosis = "El diagnostico es obligatorio.";
      }
    }

    if (stepNumber === 3) {
      if (form.entryMode === "consulta" && !form.treatmentPlan.trim()) {
        errors.treatmentPlan = "El tratamiento es obligatorio para una consulta.";
      }
      if (form.entryMode === "seguimiento" && !form.evolutionStatus.trim()) {
        errors.evolutionStatus = "La evolucion es obligatoria para un seguimiento.";
      }
    }

    return errors;
  }

  function nextStep() {
    const errors = validateStep(step);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setStep((current) => ensureWizardStep(current + 1));
  }

  function prevStep() {
    setValidationErrors({});
    setStep((current) => ensureWizardStep(current - 1));
  }

  function buildPdfPreviewData(timestamp: string): ConsultationPdfPreviewData {
    const fallbackTreatment = pendingFollowUp?.treatmentPlan || "";
    const finalTreatment = form.treatmentPlan.trim() || fallbackTreatment;
    const patient = patients.find((item) => item.id === form.patientId);

    return {
      patientName: patient?.full_name ?? "Paciente",
      patientDocument: patient?.document_number ?? "sin-documento",
      consultationDate: new Date(timestamp).toLocaleString("es-EC"),
      anamnesis: form.anamnesis,
      symptoms: form.symptoms,
      diagnosis: form.diagnosis,
      cieCodes: normalizeCommaValues(form.cieCodes),
      treatmentPlan: finalTreatment,
      specialtyKind: form.specialtyKind,
      evolutionStatus: form.evolutionStatus || undefined,
      followUpDate: form.nextFollowUpDate || undefined,
    };
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
    const finalTreatment = form.treatmentPlan.trim() || fallbackTreatment;

    const timestamp = nowIso();
    const recordId = crypto.randomUUID();
    const specialtyId = crypto.randomUUID();

    const specialtyData = {
      specialty_kind: form.specialtyKind,
      schema_version: 2,
      recorded_at: timestamp,
      doctor_id: tenant.doctor_id,
      anamnesis: form.anamnesis.trim(),
      symptoms: form.symptoms.trim(),
      diagnosis: form.diagnosis.trim(),
      treatment_plan: finalTreatment,
      treatment_template_id: form.treatmentTemplateId || null,
      evolution_status: form.evolutionStatus.trim() || null,
      next_follow_up_date: form.nextFollowUpDate || null,
      follow_up_mode: form.entryMode,
      linked_record_id:
        form.entryMode === "seguimiento"
          ? form.linkedRecordId || null
          : null,
    };

    const record: ClinicalRecordRecord = {
      id: recordId,
      clinic_id: tenant.clinic_id,
      doctor_id: tenant.doctor_id,
      patient_id: form.patientId,
      chief_complaint: form.anamnesis.trim(),
      cie_codes: normalizeCommaValues(form.cieCodes),
      specialty_kind: form.specialtyKind,
      specialty_data_id: specialtyId,
      specialty_data: specialtyData,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const specialtyRow: SpecialtyDataRow = {
      id: specialtyId,
      clinic_id: tenant.clinic_id,
      doctor_id: tenant.doctor_id,
      clinical_record_id: record.id,
      specialty_kind: form.specialtyKind,
      data: specialtyData,
      created_at: timestamp,
      updated_at: timestamp,
    };

    await saveClinicalRecordLocal(record);
    await saveSpecialtyDataLocal(specialtyRow);

    await enqueueSyncItem({
      id: crypto.randomUUID(),
      table_name: "clinical_records",
      record_id: record.id,
      action: "insert",
      payload: record,
      doctor_id: tenant.doctor_id,
      clinic_id: tenant.clinic_id,
      client_timestamp: Date.now(),
      status: "pending",
      retry_count: 0,
    });

    await enqueueSyncItem({
      id: crypto.randomUUID(),
      table_name: "specialty_data",
      record_id: specialtyRow.id,
      action: "insert",
      payload: specialtyRow,
      doctor_id: tenant.doctor_id,
      clinic_id: tenant.clinic_id,
      client_timestamp: Date.now(),
      status: "pending",
      retry_count: 0,
    });

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
      shouldGeneratePdf
        ? form.entryMode === "seguimiento"
          ? "Seguimiento guardado y evolucion actualizada con PDF generado."
          : "Consulta guardada con flujo guiado y PDF generado."
        : form.entryMode === "seguimiento"
          ? "Seguimiento guardado sin generar PDF."
          : "Consulta guardada sin generar PDF.",
    );
  }

  async function handleSaveWithoutPdf() {
    setSaving(true);
    setError(null);

    try {
      await saveConsultation({ generatePdf: false });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo completar la consulta.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWithPdf() {
    setSaving(true);
    setError(null);

    try {
      await saveConsultation({ generatePdf: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo completar la consulta.",
      );
    } finally {
      setSaving(false);
    }
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
    nextStep,
    prevStep,
    applyTemplate,
    createQuickPatient,
    applyFollowUpMode,
    applyConsultaMode,
    applyCieSuggestion,
    handleSaveWithoutPdf,
    handleSaveWithPdf,
    getCurrentPdfPreviewData,
  };
}
