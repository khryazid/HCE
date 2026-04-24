"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadTenantProfile, type TenantProfile } from "@/lib/supabase/profile";
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
import type { ClinicalRecordRecord, SpecialtyDataRow } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import { CIE_CATALOG, searchCieCatalog } from "@/lib/constants/cie-catalog";
import { generateConsultationPdf } from "@/lib/consultations/pdf";
import { ensureWizardStep, formatTimelineDate, normalizeCommaValues } from "@/lib/consultations/workflow";
import { loadLetterheadSettings } from "@/lib/local-data/letterhead";
import { listTreatmentTemplates, type TreatmentTemplate } from "@/lib/local-data/treatments";

function nowIso() {
  return new Date().toISOString();
}

type WizardForm = {
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

const EMPTY_FORM: WizardForm = {
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
  fullName: "",
  birthDate: "",
};

export default function ConsultasPage() {
  const router = useRouter();
  const deepLinkHandled = useRef(false);
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [records, setRecords] = useState<ClinicalRecordRecord[]>([]);
  const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardForm>(EMPTY_FORM);
  const [quickPatient, setQuickPatient] = useState(EMPTY_QUICK_PATIENT);
  const [selectedPatientTimelineId, setSelectedPatientTimelineId] = useState<string>("");
  const [cieSuggestions, setCieSuggestions] = useState<CieSuggestion[]>([]);
  const [cieSuggestionSource, setCieSuggestionSource] = useState<CieSuggestionSource>("catalog");
  const [cieSuggestionLoading, setCieSuggestionLoading] = useState(false);
  const [cieSuggestionError, setCieSuggestionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPatientRecords = useMemo(() => {
    if (!form.patientId) {
      return [] as ClinicalRecordRecord[];
    }

    return records
      .filter((record) => record.patient_id === form.patientId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [form.patientId, records]);

  const latestPatientRecord = selectedPatientRecords[0] ?? null;

  const pendingFollowUp = useMemo(() => {
    if (!latestPatientRecord) {
      return null;
    }

    const data = latestPatientRecord.specialty_data as Record<string, unknown>;
    const dueDateRaw = typeof data.next_follow_up_date === "string" ? data.next_follow_up_date : null;
    if (!dueDateRaw) {
      return null;
    }

    const dueDate = new Date(dueDateRaw);
    if (Number.isNaN(dueDate.getTime())) {
      return null;
    }

    const diagnosis = typeof data.diagnosis === "string" && data.diagnosis.trim().length > 0
      ? data.diagnosis
      : latestPatientRecord.chief_complaint;

    return {
      recordId: latestPatientRecord.id,
      dueDateRaw,
      dueDateLabel: dueDate.toLocaleDateString("es-EC"),
      isOverdue: dueDate.getTime() < Date.now(),
      diagnosis,
      treatmentPlan:
        typeof data.treatment_plan === "string" && data.treatment_plan.trim().length > 0
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

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const profile = await loadTenantProfile(session.user.id);
        if (!profile) {
          throw new Error("No se encontro perfil tenant para esta cuenta.");
        }

        const [patientRows, consultationRows] = await Promise.all([
          listPatientsByTenant(profile.doctor_id, profile.clinic_id),
          listClinicalRecordsByTenant(profile.doctor_id, profile.clinic_id),
        ]);

        if (!active) {
          return;
        }

        setTenant(profile);
        setPatients(patientRows);
        setRecords(consultationRows);
        setTemplates(listTreatmentTemplates(profile.doctor_id, profile.clinic_id));
        setSelectedPatientTimelineId(patientRows[0]?.id ?? "");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar consultas.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (loading || deepLinkHandled.current) {
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
    const prevDiagnosis = typeof data.diagnosis === "string" ? data.diagnosis : "";
    const prevSymptoms = typeof data.symptoms === "string" ? data.symptoms : "";
    const prevTreatment = typeof data.treatment_plan === "string" ? data.treatment_plan : "";

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
  }, [loading, records, router]);

  useEffect(() => {
    if (!wizardOpen || step !== 2) {
      setCieSuggestions([]);
      setCieSuggestionSource("catalog");
      setCieSuggestionLoading(false);
      setCieSuggestionError(null);
      return;
    }

    const query = [form.diagnosis, form.symptoms, form.anamnesis].filter(Boolean).join(" ").trim();
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

          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
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

            setCieSuggestionError("La sugerencia asistida no estuvo disponible; se conservan coincidencias locales.");
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
  }, [form.anamnesis, form.diagnosis, form.specialtyKind, form.symptoms, step, wizardOpen]);

  function resetWizard() {
    setForm(EMPTY_FORM);
    setQuickPatient(EMPTY_QUICK_PATIENT);
    setStep(1);
    setWizardOpen(false);
    setCieSuggestions([]);
    setCieSuggestionSource("catalog");
    setCieSuggestionLoading(false);
    setCieSuggestionError(null);
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

    if (!quickPatient.documentNumber.trim() || !quickPatient.fullName.trim()) {
      throw new Error("Completa documento y nombre del paciente rapido.");
    }

    const timestamp = nowIso();
    const patient: PatientRecord = {
      id: crypto.randomUUID(),
      clinic_id: tenant.clinic_id,
      doctor_id: tenant.doctor_id,
      document_number: quickPatient.documentNumber.trim(),
      full_name: quickPatient.fullName.trim(),
      birth_date: quickPatient.birthDate ? quickPatient.birthDate : null,
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
    const prevDiagnosis = typeof data.diagnosis === "string" ? data.diagnosis : "";
    const prevSymptoms = typeof data.symptoms === "string" ? data.symptoms : "";
    const prevTreatment = typeof data.treatment_plan === "string" ? data.treatment_plan : "";

    setForm((current) => ({
      ...current,
      entryMode: "seguimiento",
      linkedRecordId: record.id,
      diagnosis: current.diagnosis || prevDiagnosis,
      symptoms: current.symptoms || prevSymptoms,
      anamnesis: current.anamnesis || `Seguimiento de ${prevDiagnosis || "consulta previa"}`,
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

  function nextStep() {
    setStep((current) => ensureWizardStep(current + 1));
  }

  function prevStep() {
    setStep((current) => ensureWizardStep(current - 1));
  }

  async function saveConsultation() {
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
      throw new Error("Debes definir un tratamiento para cerrar la consulta.");
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
      linked_record_id: form.entryMode === "seguimiento" ? form.linkedRecordId || null : null,
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

    const patient = patients.find((item) => item.id === form.patientId);
    const letterhead = loadLetterheadSettings(tenant.doctor_id, tenant.clinic_id);

    generateConsultationPdf(letterhead, {
      patientName: patient?.full_name ?? "Paciente",
      patientDocument: patient?.document_number ?? "sin-documento",
      consultationDate: new Date(timestamp).toLocaleString("es-EC"),
      anamnesis: form.anamnesis,
      symptoms: form.symptoms,
      diagnosis: form.diagnosis,
      cieCodes: normalizeCommaValues(form.cieCodes),
      treatmentPlan: form.treatmentPlan,
      specialtyKind: form.specialtyKind,
      evolutionStatus: form.evolutionStatus,
      followUpDate: form.nextFollowUpDate,
    });

    const nextRecords = await listClinicalRecordsByTenant(tenant.doctor_id, tenant.clinic_id);
    setRecords(nextRecords);
    resetWizard();
    setMessage(
      form.entryMode === "seguimiento"
        ? "Seguimiento guardado y evolucion actualizada con PDF generado."
        : "Consulta guardada con flujo guiado y PDF generado.",
    );
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);

    try {
      await saveConsultation();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo completar la consulta.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Cargando consultas...</p>;
  }

  const cieMatches = searchCieCatalog([form.diagnosis, form.symptoms, form.anamnesis].filter(Boolean).join(" "));
  const selectedCieCodes = normalizeCommaValues(form.cieCodes);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Flujo de consulta</h1>
          <p className="text-sm text-slate-700">
            Registro guiado por pasos: paciente, anamnesis y diagnostico, tratamiento, confirmacion y PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={openWizard}
          className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Nueva consulta
        </button>
      </header>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {wizardOpen ? (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Paso {step} de 4</h2>
            <button type="button" className="text-sm font-semibold text-slate-600" onClick={resetWizard}>
              Cerrar
            </button>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Seleccionar paciente</span>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  value={form.patientId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      patientId: event.target.value,
                      linkedRecordId: "",
                    }))
                  }
                >
                  <option value="">Selecciona un paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name} ({patient.document_number})
                    </option>
                  ))}
                </select>
              </label>

              {form.patientId ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Tipo de registro</p>
                    {pendingFollowUp ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          pendingFollowUp.isOverdue
                            ? "bg-amber-100 text-amber-800"
                            : "bg-cyan-100 text-cyan-800"
                        }`}
                      >
                        {pendingFollowUp.isOverdue ? "Seguimiento pendiente" : "Seguimiento programado"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Sin seguimiento pendiente
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyConsultaMode}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        form.entryMode === "consulta"
                          ? "border-teal-300 bg-teal-50 text-teal-900"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Consulta completa
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFollowUpMode(latestPatientRecord)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        form.entryMode === "seguimiento"
                          ? "border-teal-300 bg-teal-50 text-teal-900"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Registrar seguimiento
                    </button>
                  </div>

                  {pendingFollowUp ? (
                    <p className="text-sm text-slate-700">
                      Control {pendingFollowUp.isOverdue ? "vencido" : "programado"} para el {pendingFollowUp.dueDateLabel}.
                      Base diagnostica: {pendingFollowUp.diagnosis}.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Puedes usar modo seguimiento aunque no exista control pendiente.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900">Crear paciente rapido</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Documento"
                    value={quickPatient.documentNumber}
                    onChange={(event) =>
                      setQuickPatient((current) => ({ ...current, documentNumber: event.target.value }))
                    }
                  />
                  <input
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Nombre completo"
                    value={quickPatient.fullName}
                    onChange={(event) =>
                      setQuickPatient((current) => ({ ...current, fullName: event.target.value }))
                    }
                  />
                  <input
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    type="date"
                    value={quickPatient.birthDate}
                    onChange={(event) =>
                      setQuickPatient((current) => ({ ...current, birthDate: event.target.value }))
                    }
                  />
                </div>
                <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => void createQuickPatient()}>
                  Crear paciente rapido
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {form.entryMode === "seguimiento" ? (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  Modo seguimiento activo. Se prioriza registrar evolucion y proximo control.
                </div>
              ) : null}
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Anamnesis"
                value={form.anamnesis}
                onChange={(event) => setForm((current) => ({ ...current, anamnesis: event.target.value }))}
              />
              <textarea
                className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Sintomas"
                value={form.symptoms}
                onChange={(event) => setForm((current) => ({ ...current, symptoms: event.target.value }))}
                disabled={form.entryMode === "seguimiento"}
              />
              <textarea
                className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Diagnostico"
                value={form.diagnosis}
                onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))}
                disabled={form.entryMode === "seguimiento"}
              />
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Codigos CIE separados por coma"
                value={form.cieCodes}
                onChange={(event) => setForm((current) => ({ ...current, cieCodes: event.target.value }))}
                disabled={form.entryMode === "seguimiento"}
              />
              <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">Sugerencias CIE</p>
                    <p className="text-sm text-slate-700">Se actualizan mientras escribes diagnostico, sintomas y anamnesis.</p>
                  </div>
                  <div className="text-right text-xs text-teal-700">
                    <p className="font-semibold">{cieSuggestionSource === "gemini" ? "IA validada" : "Catalogo local"}</p>
                    {cieSuggestionLoading ? <p>Actualizando...</p> : null}
                  </div>
                </div>
                {cieSuggestionError ? <p className="text-xs text-amber-700">{cieSuggestionError}</p> : null}
                {cieSuggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cieSuggestions.map((entry) => {
                      const alreadyAdded = selectedCieCodes.includes(entry.code);

                      return (
                        <button
                          key={`${entry.source}-${entry.code}`}
                          type="button"
                          onClick={() => applyCieSuggestion(entry.code)}
                          disabled={alreadyAdded}
                          className="rounded-full border border-teal-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="block font-semibold text-slate-900">
                            {entry.code} · {entry.description}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {entry.source === "gemini" ? "IA validada" : "Catalogo local"} · {Math.round(entry.confidence * 100)}%
                          </span>
                          <span className="block text-[11px] text-slate-500">{alreadyAdded ? "Ya agregado" : entry.rationale}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    Escribe al menos un diagnostico o sintoma para recibir sugerencias.
                  </p>
                )}
                {cieSuggestions[0] ? (
                  <button
                    type="button"
                    onClick={() => applyCieSuggestion(cieSuggestions[0].code)}
                    className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Aplicar primera sugerencia
                  </button>
                ) : null}
              </div>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={form.specialtyKind}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    specialtyKind: event.target.value as WizardForm["specialtyKind"],
                  }))
                }
              >
                <option value="medicina-general">Medicina general</option>
                <option value="pediatria">Pediatria</option>
                <option value="odontologia">Odontologia</option>
              </select>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Catalogo CIE sugerido</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {cieMatches.slice(0, 6).map((entry) => (
                    <p key={entry.code}>{entry.code} · {entry.description}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              {form.entryMode === "consulta" ? (
                <>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    value={form.treatmentTemplateId}
                    onChange={(event) => applyTemplate(event.target.value)}
                  >
                    <option value="">Sin plantilla</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title} · {template.trigger}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="min-h-32 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Tratamiento final (editable)"
                    value={form.treatmentPlan}
                    onChange={(event) => setForm((current) => ({ ...current, treatmentPlan: event.target.value }))}
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  En seguimiento el tratamiento previo se conserva y solo se registra evolucion/control.
                </div>
              )}
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Estado de evolucion (opcional)"
                value={form.evolutionStatus}
                onChange={(event) => setForm((current) => ({ ...current, evolutionStatus: event.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                type="date"
                value={form.nextFollowUpDate}
                onChange={(event) => setForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))}
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
              <p><strong>Paciente:</strong> {patients.find((item) => item.id === form.patientId)?.full_name || "No seleccionado"}</p>
              <p><strong>Anamnesis:</strong> {form.anamnesis || "-"}</p>
              <p><strong>Sintomas:</strong> {form.symptoms || "-"}</p>
              <p><strong>Diagnostico:</strong> {form.diagnosis || "-"}</p>
              <p><strong>CIE:</strong> {form.cieCodes || "-"}</p>
              <p><strong>Tipo:</strong> {form.entryMode === "seguimiento" ? "Seguimiento" : "Consulta"}</p>
              <p><strong>Tratamiento:</strong> {form.treatmentPlan || pendingFollowUp?.treatmentPlan || "-"}</p>
              <p><strong>Evolucion:</strong> {form.evolutionStatus || "-"}</p>
              <p><strong>Proximo control:</strong> {form.nextFollowUpDate || "-"}</p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button type="button" onClick={prevStep} disabled={step === 1 || saving} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60">
              Anterior
            </button>
            {step < 4 ? (
              <button type="button" onClick={nextStep} disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
                Siguiente
              </button>
            ) : (
              <button type="button" onClick={() => void handleComplete()} disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Guardando..." : "Confirmar, guardar y generar PDF"}
              </button>
            )}
          </div>
        </article>
      ) : null}

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Timeline clinico por paciente</h2>
        <select
          className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={selectedPatientTimelineId}
          onChange={(event) => setSelectedPatientTimelineId(event.target.value)}
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.full_name} ({patient.document_number})
            </option>
          ))}
        </select>

        {timelineRows.length === 0 ? (
          <p className="text-sm text-slate-600">Aun no hay controles para este paciente.</p>
        ) : (
          <div className="space-y-3">
            {timelineRows.map((row) => {
              const data = row.specialty_data as Record<string, unknown>;

              return (
                <article key={row.id} className="rounded-2xl border border-slate-200 p-4 text-sm space-y-1">
                  <p className="font-semibold text-slate-900">{formatTimelineDate(row.updated_at)} · {row.specialty_kind}</p>
                  <p className="text-slate-700">{String(data.diagnosis ?? row.chief_complaint)}</p>
                  <p className="text-slate-600">Evolucion: {String(data.evolution_status ?? "no registrada")}</p>
                  <p className="text-slate-600">Proximo control: {String(data.next_follow_up_date ?? "sin fecha")}</p>
                </article>
              );
            })}
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Catalogo CIE local (version {CIE_CATALOG[0]?.version})</h2>
        <p className="text-sm text-slate-600">El catalogo local permite sugerencias rapidas en entorno offline-first.</p>
      </article>
    </section>
  );
}
