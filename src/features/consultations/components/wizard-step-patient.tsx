"use client";

import { memo, useMemo, useState } from "react";
import { User, Briefcase, Shield, Droplet, Users, Phone, UserPlus, Search, IdCard, Calendar } from "lucide-react";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { PatientRecord } from "@/features/patients/types";
import type {
  WizardForm,
  QuickPatientForm,
  PendingFollowUp,
} from "@/features/consultations/lib/use-consultation-wizard";

function calculateAge(birthDate: string): string {
  if (!birthDate || !birthDate.includes("-") || birthDate.length !== 10) return "";
  const [yearStr, monthStr, dayStr] = birthDate.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const birth = new Date(year, month - 1, day);
  if (
    isNaN(birth.getTime()) ||
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return "Fecha inválida";
  }

  const now = new Date();
  if (birth > now) return "Fecha futura";

  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  
  if (age > 130) return "Edad irreal";
  
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

const WizardStepPatient = memo(function WizardStepPatient({
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
  // Start on "create" tab if quickPatient data is pre-filled from URL params
  const [activeTab, setActiveTab] = useState<"search" | "create">(() =>
    !form.patientId && (quickPatient.documentNumber || quickPatient.firstName)
      ? "create"
      : "search"
  );
  const [showExtraDetails, setShowExtraDetails] = useState(false);

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
              <p className="mt-1 text-xs text-ink-soft">
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

          <div className="space-y-4">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors min-h-[44px] py-2"
              onClick={() => setShowExtraDetails(prev => !prev)}
              aria-expanded={showExtraDetails}
              aria-controls="extra-details-panel"
            >
              <svg
                className={`h-4 w-4 transform transition-transform ${showExtraDetails ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showExtraDetails ? "Ocultar detalles complementarios" : "Mostrar detalles complementarios (Ocupación, Contacto de emergencia)"}
            </button>

            {showExtraDetails && (
              <div id="extra-details-panel" className="space-y-4 pt-2 border-t border-border mt-4 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-sm font-semibold text-ink">Datos complementarios para la consulta</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                      <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                        <User className="h-3 w-3" /> Sexo Biológico <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="patient-gender"
                        aria-label="Sexo Biológico"
                        className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                        value={form.gender}
                        onChange={(e) => setForm(c => ({ ...c, gender: e.target.value as "Hombre" | "Mujer" | "" }))}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Hombre">Hombre</option>
                        <option value="Mujer">Mujer</option>
                      </select>
                    </div>
                    <p className="text-xs text-ink-soft px-1">
                      Dato médico-legal obligatorio para valores de referencia de laboratorio.
                    </p>
                  </div>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                      <Briefcase className="h-3 w-3" /> Ocupación
                    </label>
                    <input
                      id="patient-occupation"
                      aria-label="Ocupación"
                      className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                      placeholder="Ej: Docente, Arquitecto"
                      value={form.occupation}
                      onChange={(e) => setForm(c => ({ ...c, occupation: e.target.value }))}
                    />
                  </div>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                      <Shield className="h-3 w-3" /> Aseguradora / EPS
                    </label>
                    <input
                      id="patient-insurance"
                      aria-label="Aseguradora o EPS"
                      className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                      placeholder="Ej: Particular, IESS"
                      value={form.insurance}
                      onChange={(e) => setForm(c => ({ ...c, insurance: e.target.value }))}
                    />
                  </div>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                      <Droplet className="h-3 w-3" /> Tipo de Sangre
                    </label>
                    <select
                      id="patient-blood-type"
                      aria-label="Tipo de Sangre"
                      className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
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

                {/* Contacto de Emergencia */}
                <h4 className="text-sm font-semibold text-ink mt-6">Contacto de Emergencia</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                      <UserPlus className="h-3 w-3" /> Nombre
                    </label>
                    <input
                      aria-label="Nombre de contacto de emergencia"
                      className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                      placeholder="Ej: Ana Gómez"
                      value={form.emergency_contact.name}
                      onChange={(e) => setForm(c => ({ ...c, emergency_contact: { ...c.emergency_contact, name: e.target.value } }))}
                    />
                  </div>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                      <Users className="h-3 w-3" /> Parentesco
                    </label>
                    <input
                      aria-label="Parentesco de contacto de emergencia"
                      className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                      placeholder="Ej: Madre, Esposo, Amigo"
                      value={form.emergency_contact.relationship}
                      onChange={(e) => setForm(c => ({ ...c, emergency_contact: { ...c.emergency_contact, relationship: e.target.value } }))}
                    />
                  </div>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                    <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                      <Phone className="h-3 w-3" /> Teléfono
                    </label>
                    <input
                      aria-label="Teléfono de contacto de emergencia"
                      className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                      type="tel"
                      placeholder="Ej: +593 99 000 0000"
                      value={form.emergency_contact.phone}
                      onChange={(e) => setForm(c => ({ ...c, emergency_contact: { ...c.emergency_contact, phone: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-ink">Datos de Ingreso</h4>

            {/* A. Tipo de consulta */}
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 pt-7 shadow-sm">
              <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft">
                Tipo de Consulta
              </label>
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
                    className={`hce-chip min-h-[44px] ${
                      form.consultationType === value
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                        : "border-border bg-bg-soft text-ink hover:border-teal-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* B. Fuente de información */}
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
              <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                Fuente de Información
              </label>
              <select
                className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
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
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 pt-7 shadow-sm">
              <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft">
                Confiabilidad del Informante
              </label>
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
                    className={`hce-chip min-h-[44px] ${
                      form.informantReliability === value
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                        : "border-border bg-bg-soft text-ink hover:border-teal-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* D. Médico que remite */}
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
              <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                Médico que Remite (opcional)
              </label>
              <input
                className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                placeholder="Ej: Dr. García — Cardiología"
                value={form.referringDoctor}
                onChange={(e) => setForm(c => ({ ...c, referringDoctor: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
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
                className={`hce-chip min-h-[44px] ${
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
                className={`hce-chip min-h-[44px] ${
                  form.entryMode === "seguimiento"
                    ? "border-teal-500/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                    : "border-border bg-card text-ink hover:bg-bg-soft"
                }`}
              >
                Registrar seguimiento
              </button>
            </div>

            {pendingFollowUp ? (
              <p className="text-base text-ink-soft">
                Control {pendingFollowUp.isOverdue ? "vencido" : "programado"} para
                el {pendingFollowUp.dueDateLabel}. Base diagnóstica:{" "}
                {pendingFollowUp.diagnosis}.
              </p>
            ) : (
              <p className="text-base text-ink-soft">
                Puedes usar modo seguimiento si solo vas a registrar la evolución de un paciente frecuente.
              </p>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  Especialidad de la Consulta
                </label>
                <select
                  className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
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
              className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] flex items-center justify-center text-sm font-semibold border-b-2 transition-colors ${
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
              className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] flex items-center justify-center text-sm font-semibold border-b-2 transition-colors ${
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
              <div className="relative">
                <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                    <Search className="h-3 w-3" /> Buscar Paciente
                  </label>
                  <input
                    className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                    placeholder="Ej: Juan Pérez o 1712345678"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    aria-invalid={!!validationErrors.patientId}
                    aria-describedby={validationErrors.patientId ? "error-patientId" : undefined}
                  />
                </div>

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
                      className="text-teal-600 font-semibold hover:underline min-h-[44px] flex items-center px-4"
                    >
                      Registrarlo ahora
                    </button>
                  </div>
                ) : null}
              </div>

              {validationErrors.patientId ? (
                <p id="error-patientId" className="text-sm font-medium text-red-600">{validationErrors.patientId}</p>
              ) : null}
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-4 pt-2" role="tabpanel" id="patient-create-panel" aria-labelledby="patient-create-tab">
              <p className="text-base text-ink-soft">
                Ingresa los datos básicos para registrar y continuar con la consulta.
              </p>
              <div className="grid gap-4 sm:grid-cols-12">
                <div className="col-span-12 sm:col-span-6 group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                    <User className="h-3 w-3" /> Nombres
                  </label>
                  <input
                    className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
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
                
                <div className="col-span-12 sm:col-span-6 group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                    <Users className="h-3 w-3" /> Apellidos
                  </label>
                  <input
                    className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
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

                <div className="col-span-12 sm:col-span-4 group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                    <IdCard className="h-3 w-3" /> DNI / Cédula
                  </label>
                  <input
                    className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
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
                        setQuickPatient({ documentNumber: "", firstName: "", lastName: "", birthDate: "", phone: "" });
                      } else {
                        setQuickPatient((current) => ({
                          ...current,
                          documentNumber: val,
                        }));
                      }
                    }}
                  />
                </div>

                <div className="col-span-12 sm:col-span-4 group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <div className="absolute left-3 top-2 right-3 flex items-center justify-between pointer-events-none">
                    <label className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                      <Calendar className="h-3 w-3" /> Fecha Nac.
                    </label>
                    {quickPatient.birthDate && quickPatient.birthDate.length === 10 && quickPatient.birthDate.includes("-") ? (
                      (() => {
                        const ageStr = calculateAge(quickPatient.birthDate);
                        const isInvalid = ageStr === "Fecha inválida" || ageStr === "Fecha futura" || ageStr === "Edad irreal";
                        return (
                          <span className={`text-sm font-bold px-1.5 py-0.5 rounded-full ${isInvalid ? "text-red-700 bg-red-100" : "text-teal-700 bg-teal-500/10"}`}>
                            {ageStr}
                          </span>
                        );
                      })()
                    ) : null}
                  </div>
                  <input
                    className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
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

                <div className="col-span-12 sm:col-span-4 group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <label className="absolute left-3 top-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                    <Phone className="h-3 w-3" /> Teléfono
                  </label>
                  <input
                    className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
                    placeholder="Ej: 0991234567"
                    value={quickPatient.phone}
                    onChange={(event) =>
                      setQuickPatient((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={(() => {
                  if (quickPatient.birthDate && quickPatient.birthDate.length === 10 && quickPatient.birthDate.includes("-")) {
                    const ageStr = calculateAge(quickPatient.birthDate);
                    return ageStr === "Fecha inválida" || ageStr === "Fecha futura" || ageStr === "Edad irreal";
                  }
                  return false;
                })()}
                className="hce-btn-primary min-h-[44px] w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
});
export default WizardStepPatient;
