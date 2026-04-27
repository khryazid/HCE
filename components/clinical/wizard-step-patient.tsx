"use client";

import { useMemo, useState } from "react";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import type {
  WizardForm,
  QuickPatientForm,
  PendingFollowUp,
} from "@/lib/consultations/use-consultation-wizard";

function calculateAge(birthDate: string): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} años`;
}

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  patients: PatientRecord[];
  quickPatient: QuickPatientForm;
  setQuickPatient: React.Dispatch<React.SetStateAction<QuickPatientForm>>;
  pendingFollowUp: PendingFollowUp | null;
  latestPatientRecord: ClinicalRecordRecord | null;
  validationErrors: Record<string, string>;
  onCreateQuickPatient: () => void;
  onApplyConsultaMode: () => void;
  onApplyFollowUpMode: (record: ClinicalRecordRecord | null) => void;
};

export function WizardStepPatient({
  form,
  setForm,
  patients,
  quickPatient,
  setQuickPatient,
  pendingFollowUp,
  latestPatientRecord,
  validationErrors,
  onCreateQuickPatient,
  onApplyConsultaMode,
  onApplyFollowUpMode,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");

  // Autocomplete: search by name, surname, or document number
  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];

    return patients
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(query) ||
          p.document_number.toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [patients, searchQuery]);

  function selectPatient(patientId: string) {
    setForm((current) => ({
      ...current,
      patientId,
      linkedRecordId: "",
    }));
    setSearchQuery("");
    setShowSuggestions(false);
  }

  const selectedPatientLabel = patients.find((p) => p.id === form.patientId);

  function baseInputClass() {
    return "hce-input";
  }

  return (
    <div className="space-y-5">
      {/* Selected patient display overrides everything else */}
      {selectedPatientLabel ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
            <div>
              <p className="text-sm font-semibold text-teal-900">
                {selectedPatientLabel.full_name}
              </p>
              <p className="text-xs text-teal-700 mt-1">
                DNI: {selectedPatientLabel.document_number}
                {selectedPatientLabel.birth_date
                  ? ` · Edad: ${calculateAge(selectedPatientLabel.birth_date)} (${selectedPatientLabel.birth_date})`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({ ...current, patientId: "" }))
              }
              className="hce-btn-secondary bg-card text-teal-700 hover:bg-teal-50"
            >
              Cambiar paciente
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <h4 className="text-sm font-semibold text-ink">Datos complementarios para la consulta</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Género</label>
                <select
                  className="hce-input"
                  value={form.gender}
                  onChange={(e) => setForm(c => ({ ...c, gender: e.target.value }))}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Ocupación</label>
                <input
                  className="hce-input"
                  placeholder="Ej: Docente, Arquitecto"
                  value={form.occupation}
                  onChange={(e) => setForm(c => ({ ...c, occupation: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Aseguradora / EPS</label>
                <input
                  className="hce-input"
                  placeholder="Ej: Particular, IESS"
                  value={form.insurance}
                  onChange={(e) => setForm(c => ({ ...c, insurance: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                Tipo de registro clínico
              </p>
              {pendingFollowUp ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    pendingFollowUp.isOverdue
                      ? "bg-amber-100 text-amber-800"
                      : "bg-cyan-100 text-cyan-800"
                  }`}
                >
                  Seguimiento: {pendingFollowUp.isOverdue
                    ? "pendiente"
                    : "programado"}
                </span>
              ) : (
                <span className="rounded-full bg-bg-soft px-3 py-1 text-xs font-semibold text-ink-soft">
                  Sin seguimiento pendiente
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onApplyConsultaMode}
                className={`hce-chip ${
                  form.entryMode === "consulta"
                    ? "border-teal-300 bg-teal-50 text-teal-900"
                    : "border-border bg-card text-ink hover:bg-bg-soft"
                }`}
              >
                Consulta completa
              </button>
              <button
                type="button"
                onClick={() => onApplyFollowUpMode(latestPatientRecord)}
                className={`hce-chip ${
                  form.entryMode === "seguimiento"
                    ? "border-teal-300 bg-teal-50 text-teal-900"
                    : "border-border bg-card text-ink hover:bg-bg-soft"
                }`}
              >
                Registrar seguimiento
              </button>
            </div>

            {pendingFollowUp ? (
              <p className="text-sm text-ink-soft">
                Control {pendingFollowUp.isOverdue ? "vencido" : "programado"} para
                el {pendingFollowUp.dueDateLabel}. Base diagnóstica:{" "}
                {pendingFollowUp.diagnosis}.
              </p>
            ) : (
              <p className="text-sm text-ink-soft">
                Puedes usar modo seguimiento si solo vas a registrar la evolución de un paciente frecuente.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-1 border-b border-border pb-px" role="tablist" aria-label="Seleccion de paciente">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              role="tab"
              aria-selected={activeTab === "search"}
              aria-controls="patient-search-panel"
              id="patient-search-tab"
              tabIndex={activeTab === "search" ? 0 : -1}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "search"
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-ink-soft hover:text-ink hover:border-border"
              }`}
            >
              Buscar Existente
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              role="tab"
              aria-selected={activeTab === "create"}
              aria-controls="patient-create-panel"
              id="patient-create-tab"
              tabIndex={activeTab === "create" ? 0 : -1}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "create"
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-ink-soft hover:text-ink hover:border-border"
              }`}
            >
              Crear Nuevo
            </button>
          </div>

          {activeTab === "search" && (
            <div className="space-y-4 pt-2" role="tabpanel" id="patient-search-panel" aria-labelledby="patient-search-tab">
              <label className="block text-sm font-medium text-ink">
                Busca por nombre, apellido o documento
              </label>
              <div className="relative">
                <input
                  className={baseInputClass()}
                  placeholder="Ej: Juan Pérez o 1712345678"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />

                {showSuggestions && suggestions.length > 0 ? (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                    {suggestions.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => selectPatient(patient.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-bg-soft border-b border-border last:border-0"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-teal-700">
                          {patient.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{patient.full_name}</p>
                          <p className="text-xs text-ink-soft mt-0.5">DNI: {patient.document_number}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {showSuggestions && searchQuery.length >= 2 && suggestions.length === 0 ? (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-border bg-card px-4 py-4 text-sm text-center text-ink-soft shadow-lg flex flex-col items-center gap-2">
                    <p>No encontramos a &quot;{searchQuery}&quot; en tus registros.</p>
                    <button 
                      type="button" 
                      onClick={() => {
                        setQuickPatient(current => ({...current, firstName: searchQuery.split(' ')[0] || '', lastName: searchQuery.split(' ').slice(1).join(' ') || ''}));
                        setActiveTab("create");
                        setShowSuggestions(false);
                      }}
                      className="text-teal-600 font-semibold hover:underline"
                    >
                      Registrarlo ahora
                    </button>
                  </div>
                ) : null}
              </div>

              {validationErrors.patientId ? (
                <p className="text-sm font-medium text-red-600">{validationErrors.patientId}</p>
              ) : null}
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-4 pt-2" role="tabpanel" id="patient-create-panel" aria-labelledby="patient-create-tab">
              <p className="text-sm text-ink-soft">
                Ingresa los datos básicos para registrar y continuar con la consulta.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Nombres</label>
                  <input
                    className="hce-input"
                    placeholder="Ej: María"
                    value={quickPatient.firstName}
                    onChange={(event) =>
                      setQuickPatient((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">Apellidos</label>
                  <input
                    className="hce-input"
                    placeholder="Ej: Gomez"
                    value={quickPatient.lastName}
                    onChange={(event) =>
                      setQuickPatient((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">DNI / Cédula</label>
                  <input
                    className="hce-input"
                    placeholder="Número de documento"
                    value={quickPatient.documentNumber}
                    onChange={(event) =>
                      setQuickPatient((current) => ({
                        ...current,
                        documentNumber: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink">Fecha de nacimiento</label>
                    {quickPatient.birthDate ? (
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                        {calculateAge(quickPatient.birthDate)}
                      </span>
                    ) : null}
                  </div>
                  <input
                    className="hce-input"
                    type="date"
                    value={quickPatient.birthDate}
                    onChange={(event) =>
                      setQuickPatient((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                className="hce-btn-primary w-full sm:w-auto"
                onClick={onCreateQuickPatient}
              >
                Crear paciente y continuar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
