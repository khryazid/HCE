"use client";

import { useMemo, useState } from "react";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import type {
  WizardForm,
  QuickPatientForm,
  PendingFollowUp,
} from "@/lib/consultations/use-consultation-wizard";

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
      {/* Search / autocomplete existing patient */}
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="hce-section-title">Paciente</p>
          <p className="hce-page-lead">
            Selecciona un paciente existente o crea uno nuevo sin salir del flujo.
          </p>
        </div>
        <label className="block text-sm font-medium text-[color:var(--ink)]">
          Buscar paciente existente
        </label>
        <div className="relative">
          <input
            className={baseInputClass()}
            placeholder="Escribe nombre, apellido o documento..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />

          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg">
              {suggestions.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => selectPatient(patient.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[color:var(--bg-soft)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bg-soft)] text-xs font-bold text-[color:var(--ink)]">
                    {patient.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[color:var(--ink)]">{patient.full_name}</p>
                    <p className="text-xs text-[color:var(--ink-soft)]">{patient.document_number}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {showSuggestions && searchQuery.length >= 2 && suggestions.length === 0 ? (
            <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--ink-soft)] shadow-lg">
              No se encontro ningun paciente. Crea uno nuevo abajo.
            </div>
          ) : null}
        </div>
      </div>

      {validationErrors.patientId ? (
        <p className="text-sm font-medium text-red-600">{validationErrors.patientId}</p>
      ) : null}

      {/* Selected patient display */}
      {selectedPatientLabel ? (
        <div className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-teal-900">
              {selectedPatientLabel.full_name}
            </p>
            <p className="text-xs text-teal-700">
              {selectedPatientLabel.document_number}
              {selectedPatientLabel.birth_date
                ? ` · ${selectedPatientLabel.birth_date}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((current) => ({ ...current, patientId: "" }))
            }
            className="rounded-lg border border-teal-300 bg-card px-2.5 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
          >
            Cambiar
          </button>
        </div>
      ) : (
        /* Also keep the select for backward compat / quick access */
        <label className="block space-y-2 text-sm font-medium text-[color:var(--ink)]">
          <span>O selecciona de la lista</span>
          <select
            className={baseInputClass()}
            value={form.patientId}
            onChange={(event) => selectPatient(event.target.value)}
          >
            <option value="">Selecciona un paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name} ({patient.document_number})
              </option>
            ))}
          </select>
        </label>
      )}

      {form.patientId ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[color:var(--ink)]">
              Tipo de registro
            </p>
            {pendingFollowUp ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  pendingFollowUp.isOverdue
                    ? "bg-amber-100 text-amber-800"
                    : "bg-cyan-100 text-cyan-800"
                }`}
              >
                {pendingFollowUp.isOverdue
                  ? "Seguimiento pendiente"
                  : "Seguimiento programado"}
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
                  : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--ink)] hover:bg-[color:var(--bg-soft)]"
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
                  : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--ink)] hover:bg-[color:var(--bg-soft)]"
              }`}
            >
              Registrar seguimiento
            </button>
          </div>

          {pendingFollowUp ? (
            <p className="text-sm text-[color:var(--ink-soft)]">
              Control{" "}
              {pendingFollowUp.isOverdue ? "vencido" : "programado"} para
              el {pendingFollowUp.dueDateLabel}. Base diagnostica:{" "}
              {pendingFollowUp.diagnosis}.
            </p>
          ) : (
            <p className="text-sm text-[color:var(--ink-soft)]">
              Puedes usar modo seguimiento aunque no exista control
              pendiente.
            </p>
          )}
        </div>
      ) : null}

      {/* Quick patient creation with separate name/surname */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">
          Crear paciente nuevo
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="hce-input"
            placeholder="Nombre"
            value={quickPatient.firstName}
            onChange={(event) =>
              setQuickPatient((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
          />
          <input
            className="hce-input"
            placeholder="Apellido"
            value={quickPatient.lastName}
            onChange={(event) =>
              setQuickPatient((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="hce-input"
            placeholder="Documento de identidad"
            value={quickPatient.documentNumber}
            onChange={(event) =>
              setQuickPatient((current) => ({
                ...current,
                documentNumber: event.target.value,
              }))
            }
          />
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
        <button
          type="button"
          className="hce-btn-primary"
          onClick={onCreateQuickPatient}
        >
          Crear paciente
        </button>
      </div>
    </div>
  );
}
