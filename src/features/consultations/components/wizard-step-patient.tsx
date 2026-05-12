"use client";

import { useMemo, useState } from "react";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { PatientRecord } from "@/features/patients/types";
import type {
  WizardForm,
  QuickPatientForm,
  PendingFollowUp,
} from "@/features/consultations/lib/use-consultation-wizard";

function calculateAge(birthDate: string): string {
  if (!birthDate || !birthDate.includes("-") || birthDate.length !== 10) return "";
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return "";
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
  tenantSpecialties: string[];
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
  tenantSpecialties,
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
    const p = patients.find(p => p.id === patientId);
    setForm((current) => ({
      ...current,
      patientId,
      linkedRecordId: "",
      patientStatus: p?.status ?? "activo",
    }));
    setSearchQuery("");
    setShowSuggestions(false);
  }

  const selectedPatientLabel = patients.find((p) => p.id === form.patientId);

  function baseInputClass() {
    return "hce-input";
  }

  return (
    <div className="space-y-5" id="field-patientId">
      {/* Selected patient display overrides everything else */}
      {selectedPatientLabel ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
            <div>
              <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                {selectedPatientLabel.full_name}
              </p>
              <p className="mt-1 text-xs text-teal-800 dark:text-teal-200">
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
              className="hce-btn-secondary"
            >
              Cambiar paciente
            </button>
          </div>

          <div className="hce-card space-y-4">
            <h4 className="text-sm font-semibold text-ink">Datos complementarios para la consulta</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Sexo Biológico <span className="text-red-500">*</span>
                </label>
                <select
                  className="hce-input"
                  value={form.gender}
                  onChange={(e) => setForm(c => ({ ...c, gender: e.target.value as "Hombre" | "Mujer" | "" }))}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
                <p className="text-[10px] text-ink-soft">
                  Dato médico-legal obligatorio para valores de referencia de laboratorio.
                </p>
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
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Tipo de Sangre</label>
                <select
                  className="hce-input"
                  value={form.blood_type}
                  onChange={(e) => setForm(c => ({ ...c, blood_type: e.target.value as typeof form.blood_type }))}
                >
                  <option value="">Desconocido</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div className="hce-card space-y-4">
            <h4 className="text-sm font-semibold text-ink">Contacto de Emergencia</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Nombre</label>
                <input
                  className="hce-input"
                  placeholder="Ej: Ana Gómez"
                  value={form.emergency_contact.name}
                  onChange={(e) => setForm(c => ({ ...c, emergency_contact: { ...c.emergency_contact, name: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Parentesco</label>
                <input
                  className="hce-input"
                  placeholder="Ej: Madre, Esposo, Amigo"
                  value={form.emergency_contact.relationship}
                  onChange={(e) => setForm(c => ({ ...c, emergency_contact: { ...c.emergency_contact, relationship: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Teléfono</label>
                <input
                  className="hce-input"
                  type="tel"
                  placeholder="Ej: +593 99 000 0000"
                  value={form.emergency_contact.phone}
                  onChange={(e) => setForm(c => ({ ...c, emergency_contact: { ...c.emergency_contact, phone: e.target.value } }))}
                />
              </div>
            </div>
          </div>

          <div className="hce-card space-y-4">
            <h4 className="text-sm font-semibold text-ink">Datos de Ingreso</h4>

            {/* A. Tipo de consulta */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Tipo de Consulta</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "primera-vez", label: "Primera vez" },
                  { value: "control", label: "Control / Seguimiento" },
                  { value: "urgencia", label: "Urgencia" },
                  { value: "interconsulta", label: "Interconsulta" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(c => ({ ...c, consultationType: value }))}
                    className={`hce-chip ${
                      form.consultationType === value
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                        : "border-border bg-card text-ink hover:bg-bg-soft"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* B. Fuente de información */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Fuente de Información</label>
              <select
                className="hce-input"
                value={form.informantSource}
                onChange={(e) => setForm(c => ({ ...c, informantSource: e.target.value as typeof form.informantSource }))}
              >
                <option value="paciente">Paciente (directo)</option>
                <option value="familiar">Familiar / Acompañante</option>
                <option value="expediente">Expediente / Historia previa</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* C. Confiabilidad del informante */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Confiabilidad del Informante</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "confiable", label: "Confiable" },
                  { value: "parcialmente-confiable", label: "Parcialmente confiable" },
                  { value: "no-confiable", label: "No confiable" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(c => ({ ...c, informantReliability: value }))}
                    className={`hce-chip ${
                      form.informantReliability === value
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                        : "border-border bg-card text-ink hover:bg-bg-soft"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* D. Médico que remite */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Médico que Remite <span className="font-normal text-ink-soft">(opcional)</span></label>
              <input
                className="hce-input"
                placeholder="Dr. García — Cardiología"
                value={form.referringDoctor}
                onChange={(e) => setForm(c => ({ ...c, referringDoctor: e.target.value }))}
              />
            </div>
          </div>

          <div className="hce-card space-y-4">
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
                    ? "border-teal-500/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
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
                    ? "border-teal-500/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
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

            <div className="mt-4 border-t border-border pt-4">
              <label className="text-xs font-semibold text-ink">Especialidad de la Consulta</label>
              <select
                className="hce-input mt-1.5"
                value={form.specialtyKind}
                onChange={(e) => setForm(c => ({ ...c, specialtyKind: e.target.value }))}
              >
                {tenantSpecialties.length > 0 ? (
                  tenantSpecialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))
                ) : (
                  <>
                    <option value="medicina-general">Medicina General</option>
                    <option value="pediatria">Pediatría</option>
                    <option value="odontologia">Odontología</option>
                  </>
                )}
              </select>
            </div>
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
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-sm font-bold text-teal-700 dark:text-teal-400">
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
                  <label className="text-xs font-semibold text-ink">DNI / Cédula</label>
                  <input
                    className="hce-input"
                    placeholder="Número de documento"
                    value={quickPatient.documentNumber}
                    onChange={(event) => {
                      const val = event.target.value;
                      const existing = patients.find(p => p.document_number === val.trim());
                      if (existing) {
                        setForm((current) => ({
                          ...current,
                          patientId: existing.id,
                          linkedRecordId: "",
                          patientStatus: existing.status ?? "activo",
                        }));
                        setQuickPatient({ documentNumber: "", firstName: "", lastName: "", birthDate: "" });
                      } else {
                        setQuickPatient((current) => ({
                          ...current,
                          documentNumber: val,
                        }));
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink">Fecha de nacimiento</label>
                    {quickPatient.birthDate && quickPatient.birthDate.length === 10 && quickPatient.birthDate.includes("-") ? (
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full">
                        {calculateAge(quickPatient.birthDate)}
                      </span>
                    ) : null}
                  </div>
                  <input
                    className="hce-input"
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={
                      quickPatient.birthDate.includes("-") && quickPatient.birthDate.length === 10
                        ? quickPatient.birthDate.split("-").reverse().join("/")
                        : quickPatient.birthDate
                    }
                    onChange={(event) => {
                      let val = event.target.value.replace(/\D/g, "");
                      if (val.length > 8) val = val.slice(0, 8);
                      
                      let formatted = val;
                      if (val.length > 4) {
                        formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                      } else if (val.length > 2) {
                        formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                      }
                      
                      if (val.length === 8) {
                        const iso = `${val.slice(4)}-${val.slice(2, 4)}-${val.slice(0, 2)}`;
                        setQuickPatient((current) => ({ ...current, birthDate: iso }));
                      } else {
                        setQuickPatient((current) => ({ ...current, birthDate: formatted }));
                      }
                    }}
                  />
                </div>
              </div>
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
