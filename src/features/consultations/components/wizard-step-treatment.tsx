"use client";

import { memo } from "react";

import { ChipSelector } from "@/features/consultations/components/chip-selector";
import { TestTube, Scan, LayoutTemplate, Utensils, Stethoscope, HeartPulse, Pill, Info, AlertCircle, Activity, Calendar, TrendingUp, CreditCard } from "lucide-react";
import {
  MedicationInstructionsBuilder,
  assembleInstructionText,
} from "@/features/consultations/components/medication-instructions-builder";
import type { MedInstruction } from "@/features/consultations/components/medication-instructions-builder";
import type { TreatmentTemplate } from "@/features/consultations/lib/treatments";
import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import type { ClinicalRecordRecord } from "@/features/consultations/types";

const LAB_CATALOG = [
  "Hemograma completo (CBC)",
  "Glicemia / Glucemia",
  "Urea y Creatinina",
  "Perfil lipídico",
  "Perfil hepático (TGO/TGP)",
  "Examen general de orina (EGO)",
  "PCR / Proteína C reactiva",
  "TSH / T4 libre",
  "HbA1c",
  "Electrolitos séricos",
  "Ácido úrico",
  "Ferritina / Hierro sérico",
  "INR / TP",
  "Cultivo y antibiograma",
  "β-hCG (prueba de embarazo)",
];

const IMAGING_CATALOG = [
  "Rx tórax PA y lateral",
  "Rx abdomen simple",
  "Rx de columna cervical",
  "Rx de columna lumbar",
  "Rx de extremidad (especificar)",
  "Ecografía abdominal",
  "Ecografía pélvica",
  "Ecografía de partes blandas",
  "TC de tórax",
  "TC de abdomen y pelvis",
  "TC de cráneo",
  "RM cerebral",
  "RM de columna",
  "RM de rodilla / hombro",
  "Electrocardiograma (ECG)",
  "Ecocardiograma",
  "Mamografía",
  "Densitometría ósea",
];

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  templates: TreatmentTemplate[];
  validationErrors: Record<string, string>;
  latestPatientRecord?: ClinicalRecordRecord | null;
  onApplyTemplate: (templateId: string) => void;
  uiPreferences?: Record<string, boolean>;
  onToggleSection?: (key: string) => void;
};

function SectionHeader({ 
  title, 
  prefKey, 
  uiPreferences, 
  onToggle 
}: { 
  title: string; 
  prefKey: string; 
  uiPreferences?: Record<string, boolean>; 
  onToggle?: (key: string) => void;
}) {
  const isHidden = uiPreferences?.[prefKey] === true;
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <h4 className="text-sm font-semibold text-ink">
        {title}
      </h4>
      {onToggle && (
        <button
          type="button"
          onClick={() => onToggle(prefKey)}
          className="text-xs uppercase font-bold tracking-wider text-ink-soft hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors bg-bg-soft px-2.5 py-1 rounded-md flex items-center gap-1.5"
        >
          {isHidden ? (
            <><span>👁️</span> Mostrar</>
          ) : (
            <><span>🙈</span> Ocultar</>
          )}
        </button>
      )}
    </div>
  );
}

const WizardStepTreatment = memo(function WizardStepTreatment({
  form,
  setForm,
  templates,
  validationErrors,
  latestPatientRecord,
  onApplyTemplate,
  uiPreferences,
  onToggleSection,
}: Props) {

  function updateField(field: "treatmentPlan" | "recommendations" | "warningSigns", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleBulletKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: "treatmentPlan" | "recommendations" | "warningSigns",
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const insert = "\n\u2022 ";
    const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
    updateField(field, next);
    const pos = selectionStart + insert.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }

  function handleBulletFocus(
    e: React.FocusEvent<HTMLTextAreaElement>,
    field: "treatmentPlan" | "recommendations" | "warningSigns",
  ) {
    if (e.target.value.trim()) return;
    updateField(field, "\u2022 ");
    requestAnimationFrame(() => {
      e.target.selectionStart = e.target.selectionEnd = 2;
    });
  }

  return (
    <div className="space-y-8">
      {form.entryMode === "seguimiento" ? (
        <div className="hce-alert-info">
          Modo seguimiento: El tratamiento de la consulta anterior está precargado. Puedes modificarlo o dejarlo igual, y agregar cómo ha evolucionado.
        </div>
      ) : null}

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">C. Plantilla de Tratamiento Integral</h4>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <label className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
            <LayoutTemplate className="h-3 w-3" /> Plantilla Clínica (Autollenado)
          </label>
          <select
            className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none appearance-none"
            value={form.treatmentTemplateId}
            onChange={(event) => onApplyTemplate(event.target.value)}
          >
            <option value="">Ninguna - Escribir desde cero</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title} · {template.trigger}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-ink-soft px-1">
          Aplica medicamentos, dieta, medidas generales, recomendaciones y signos de alarma simultáneamente.
        </p>
      </div>

      {/* ÓRDENES INTRAHOSPITALARIAS (Tarea 5) */}
      <div className="space-y-4">
        <SectionHeader 
          title="D. Órdenes Intrahospitalarias / Medidas Generales" 
          prefKey="hide_medical_orders" 
          uiPreferences={uiPreferences} 
          onToggle={onToggleSection} 
        />
        
        {uiPreferences?.hide_medical_orders !== true && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-base text-ink-soft mb-4">
              Para pacientes en observación, emergencia u hospitalización. Completa si aplica.
            </p>

            <div className="space-y-4">
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <label className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Utensils className="h-3 w-3" /> Tipo de Dieta
                </label>
                <select
                  className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                  value={form.medical_orders.diet_type}
                  onChange={(e) => setForm((c) => ({ ...c, medical_orders: { ...c.medical_orders, diet_type: e.target.value } }))}
                >
                  <option value="">No aplica / No especificada</option>
                  <option value="absoluta">Absoluta (NPO)</option>
                  <option value="liquida">Líquida clara</option>
                  <option value="blanda">Blanda / Papilla</option>
                  <option value="completa">Completa</option>
                  <option value="hiposodica">Hipósodica</option>
                  <option value="diabetica">Diabética</option>
                  <option value="hipocalorica">Hipocalórica</option>
                  <option value="renal">Renal</option>
                </select>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Stethoscope className="h-3 w-3" /> Medidas Generales
                </label>
                <textarea
                  className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                  placeholder={`Ej:\n• Cabecera a 30°\n• Oxigenoterapia 2L/min por cánula nasal\n• Reposo absoluto en cama`}
                  value={form.medical_orders.general_measures}
                  onChange={(e) => setForm((c) => ({ ...c, medical_orders: { ...c.medical_orders, general_measures: e.target.value } }))}
                />
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <HeartPulse className="h-3 w-3" /> Cuidados de Enfermería
                </label>
                <textarea
                  className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                  placeholder={`Ej:\n• Control de signos vitales cada 4h\n• Balance de líquidos\n• Avisar eventualidad al médico de guardia`}
                  value={form.medical_orders.nursing_cares}
                  onChange={(e) => setForm((c) => ({ ...c, medical_orders: { ...c.medical_orders, nursing_cares: e.target.value } }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRESCRIPCIÓN MÉDICA */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
          E. Prescripción Médica (Receta)
        </h4>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <label htmlFor="field-treatmentPlan" className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
            <Pill className="h-3.5 w-3.5" /> Prescripción Médica (Receta) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="field-treatmentPlan"
            className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
            placeholder="Medicamento, Dosis, Vía de administración, Frecuencia y Duración..."
            value={form.treatmentPlan}
            onFocus={(e) => handleBulletFocus(e, "treatmentPlan")}
            onKeyDown={(e) => handleBulletKeyDown(e, "treatmentPlan")}
            onChange={(event) => updateField("treatmentPlan", event.target.value)}
            aria-invalid={!!validationErrors.treatmentPlan}
            aria-describedby={validationErrors.treatmentPlan ? "error-treatmentPlan" : undefined}
          />
          {validationErrors.treatmentPlan ? (
            <p id="error-treatmentPlan" className="absolute -bottom-6 left-1 text-xs font-medium text-red-600">{validationErrors.treatmentPlan}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink">Instrucciones de Uso para el Paciente</label>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">Hoja del paciente</span>
          </div>
          <p className="text-base text-ink-soft">
            Cada medicamento obtiene su tarjeta de posología. El texto final se imprime en la hoja del paciente.
          </p>
          <MedicationInstructionsBuilder
            treatmentPlanText={form.treatmentPlan}
            value={form.medicationInstructionsStructured}
            onChange={(instructions: MedInstruction[]) =>
              setForm((c) => ({
                ...c,
                medicationInstructionsStructured: instructions,
                medicationInstructions: assembleInstructionText(instructions),
              }))
            }
          />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
            <Info className="h-3.5 w-3.5" /> Recomendaciones Generales
          </label>
          <textarea
            className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
            placeholder="Dieta, reposo, cuidados en casa..."
            value={form.recommendations}
            onFocus={(e) => handleBulletFocus(e, "recommendations")}
            onKeyDown={(e) => handleBulletKeyDown(e, "recommendations")}
            onChange={(event) => updateField("recommendations", event.target.value)}
          />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-red-200 bg-red-50/10 shadow-sm transition-all focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400 dark:border-red-900/30 dark:bg-red-900/10">
          <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-600 transition-colors group-focus-within:text-red-500">
            <AlertCircle className="h-3.5 w-3.5" /> Signos de Alarma
          </label>
          <textarea
            className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-red-400/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
            placeholder="Acudir a urgencias en caso de..."
            value={form.warningSigns}
            onFocus={(e) => handleBulletFocus(e, "warningSigns")}
            onKeyDown={(e) => handleBulletKeyDown(e, "warningSigns")}
            onChange={(event) => updateField("warningSigns", event.target.value)}
          />
        </div>
      </div>

      {/* PARACLÍNICOS */}
      <div className="space-y-4">
        <SectionHeader 
          title="E. Paraclínicos Solicitados" 
          prefKey="hide_paraclinicals" 
          uiPreferences={uiPreferences} 
          onToggle={onToggleSection} 
        />

        {uiPreferences?.hide_paraclinicals !== true && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
            
            <div>
              <div className="mb-4">
                <h5 className="text-xs font-bold uppercase tracking-widest text-ink-soft flex items-center gap-2 mb-1">
                  <TestTube className="h-3.5 w-3.5" /> Órdenes de Laboratorio
                </h5>
                <p className="text-base text-ink-soft">Selecciona del catálogo o escribe una orden personalizada y presiona Enter.</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-3">
                <ChipSelector
                  catalog={LAB_CATALOG}
                  selected={form.labOrders}
                  onChange={(next) => setForm((c) => ({ ...c, labOrders: next }))}
                  placeholder="Ej: Perfil tiroideo completo..."
                />
              </div>
            </div>

            <div>
              <div className="mb-4">
                <h5 className="text-xs font-bold uppercase tracking-widest text-ink-soft flex items-center gap-2 mb-1">
                  <Scan className="h-3.5 w-3.5" /> Estudios de Imagen
                </h5>
                <p className="text-base text-ink-soft">Selecciona del catálogo o escribe un estudio personalizado y presiona Enter.</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-3">
                <ChipSelector
                  catalog={IMAGING_CATALOG}
                  selected={form.imagingOrders}
                  onChange={(next) => setForm((c) => ({ ...c, imagingOrders: next }))}
                  placeholder="Ej: Rx de pie derecho AP y lateral..."
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {form.entryMode === "seguimiento" ? (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">E. Evolución Clínica (SOAP)</h4>

          <div className="space-y-1.5">
            {latestPatientRecord ? (
              <div className="mb-3 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 space-y-2">
                <p className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Contexto Anterior ({new Date(latestPatientRecord.updated_at).toLocaleDateString("es-EC")})</p>
                <div className="text-xs text-ink space-y-1">
                  <p><strong>Diagnóstico:</strong> {typeof (latestPatientRecord.specialty_data as Record<string, unknown>).diagnosis === 'string' && ((latestPatientRecord.specialty_data as Record<string, unknown>).diagnosis as string).trim() ? ((latestPatientRecord.specialty_data as Record<string, unknown>).diagnosis as string) : latestPatientRecord.chief_complaint}</p>
                  <p><strong>Tratamiento:</strong> {typeof (latestPatientRecord.specialty_data as Record<string, unknown>).treatment_plan === 'string' && ((latestPatientRecord.specialty_data as Record<string, unknown>).treatment_plan as string).trim() ? ((latestPatientRecord.specialty_data as Record<string, unknown>).treatment_plan as string) : "Sin tratamiento registrado."}</p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {([
                { key: "soapSubjective" as const, letter: "S", label: "Subjetivo", color: "blue", placeholder: "El paciente refiere mejoría del 60% del dolor. Sigue con las pautas de reposo. Duerme mejor..." },
                { key: "soapObjective" as const, letter: "O", label: "Objetivo", color: "green", placeholder: "TA 120/80, FC 78 lpm. Abdomen blando, RHA+. Herida quirúrgica en buenas condiciones..." },
                { key: "soapAssessment" as const, letter: "A", label: "Assessment", color: "orange", placeholder: "Evolución favorable post-apendicectomía. Sin signos de complicación. Tolerando dieta blanda..." },
                { key: "soapPlan" as const, letter: "P", label: "Plan", color: "teal", placeholder: "Continuar con antibioticoterapia oral 3 días más. Alta hospitalaria en 24h si evolución favorable..." },
              ]).map(({ key, letter, label, color, placeholder }) => (
                <div key={key} className={`group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:ring-1 ${
                  color === "blue" ? "focus-within:border-blue-500 focus-within:ring-blue-500" :
                  color === "green" ? "focus-within:border-emerald-500 focus-within:ring-emerald-500" :
                  color === "orange" ? "focus-within:border-amber-500 focus-within:ring-amber-500" :
                  "focus-within:border-teal-500 focus-within:ring-teal-500"
                }`}>
                  <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors">
                    <span className={`flex h-4 w-4 items-center justify-center rounded text-xs font-extrabold transition-colors ${
                      color === "blue" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 group-focus-within:bg-blue-500 group-focus-within:text-white" :
                      color === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 group-focus-within:bg-emerald-500 group-focus-within:text-white" :
                      color === "orange" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 group-focus-within:bg-amber-500 group-focus-within:text-white" :
                      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 group-focus-within:bg-teal-500 group-focus-within:text-white"
                    }`}>{letter}</span> {label}
                  </label>
                  <textarea
                    id={key === "soapSubjective" ? "field-evolutionStatus" : undefined}
                    className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((c) => {
                        const next = { ...c, [key]: val };
                        const s = key === "soapSubjective" ? val : c.soapSubjective;
                        const o = key === "soapObjective" ? val : c.soapObjective;
                        const a = key === "soapAssessment" ? val : c.soapAssessment;
                        const p = key === "soapPlan" ? val : c.soapPlan;
                        next.evolutionStatus = [
                          s && `S: ${s}`,
                          o && `O: ${o}`,
                          a && `A: ${a}`,
                          p && `P: ${p}`,
                        ].filter(Boolean).join("\n\n");
                        return next;
                      });
                    }}
                    aria-invalid={key === "soapSubjective" ? !!validationErrors.evolutionStatus : undefined}
                    aria-describedby={key === "soapSubjective" && validationErrors.evolutionStatus ? "error-evolutionStatus" : undefined}
                  />
                </div>
              ))}
            </div>
            {validationErrors.evolutionStatus ? (
              <p id="error-evolutionStatus" className="text-sm font-medium text-red-600">{validationErrors.evolutionStatus}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
          {form.entryMode === "seguimiento" ? "F. Plan a Futuro" : "E. Próximo Control"}
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <label className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
              <Activity className="h-3 w-3" /> Estado Clínico
            </label>
            <select
              className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
              value={form.patientStatus}
              onChange={(e) => setForm(c => ({ ...c, patientStatus: e.target.value as "activo" | "inactivo" | "en-seguimiento" | "alta" }))}
            >
              <option value="activo">Activo (Tratamiento en curso)</option>
              <option value="en-seguimiento">En Seguimiento Constante</option>
              <option value="alta">Alta Médica (Resuelto)</option>
              <option value="inactivo">Inactivo / Abandono</option>
            </select>
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <label className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
              <Calendar className="h-3 w-3" /> Próximo Control (Opcional)
            </label>
            <input
              className="w-full bg-transparent px-3 pb-3 pt-7 text-base text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none placeholder:text-ink-faint/30"
              type="text"
              placeholder="DD/MM/AAAA"
              value={
                form.nextFollowUpDate.includes("-") && form.nextFollowUpDate.length === 10
                  ? form.nextFollowUpDate.split("-").reverse().join("/")
                  : form.nextFollowUpDate
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
                  setForm((current) => ({ ...current, nextFollowUpDate: iso }));
                } else {
                  setForm((current) => ({ ...current, nextFollowUpDate: formatted }));
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* PRONÓSTICO */}
      <div className="space-y-4">
        <SectionHeader 
          title={form.entryMode === "seguimiento" ? "G. Pronóstico" : "F. Pronóstico"}
          prefKey="hide_prognosis" 
          uiPreferences={uiPreferences} 
          onToggle={onToggleSection} 
        />

        {uiPreferences?.hide_prognosis !== true && (
          <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 pt-8 shadow-sm transition-all hover:border-accent/50">
              <label className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft">
                <TrendingUp className="h-3 w-3" /> Pronóstico Vital
              </label>
              <div className="flex gap-2">
                {(["bueno", "reservado", "malo"] as const).map((p) => (
                  <button key={p} type="button"
                    onClick={() => setForm(c => ({ ...c, prognosisVital: p }))}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                      form.prognosisVital === p
                        ? p === "bueno" ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : p === "reservado" ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        : "border-red-500 bg-red-500/10 text-red-800 dark:text-red-300"
                        : "border-border bg-transparent text-ink-soft hover:bg-bg-soft"
                    }`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 pt-8 shadow-sm transition-all hover:border-accent/50">
              <label className="absolute left-3 top-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft">
                <Activity className="h-3 w-3" /> Pronóstico Funcional
              </label>
              <div className="flex gap-2">
                {(["bueno", "reservado", "malo"] as const).map((p) => (
                  <button key={p} type="button"
                    onClick={() => setForm(c => ({ ...c, prognosisFunctional: p }))}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                      form.prognosisFunctional === p
                        ? p === "bueno" ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : p === "reservado" ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        : "border-red-500 bg-red-500/10 text-red-800 dark:text-red-300"
                        : "border-border bg-transparent text-ink-soft hover:bg-bg-soft"
                    }`}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FACTURACIÓN Y COBRO */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
          {form.entryMode === "seguimiento" ? "H. Facturación y Cobro" : "G. Facturación y Cobro"}
        </h4>
        
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <label className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-ink-soft mb-3">
            <CreditCard className="h-4 w-4" /> Estado de Pago
          </label>
          <div className="flex gap-2 mb-4">
            {(["paid", "pending", "honorific"] as const).map((s) => {
              const labels = { paid: "Cobrado", pending: "Pendiente", honorific: "Honorífico (Gratis)" };
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(c => ({ 
                    ...c, 
                    paymentStatus: s,
                    paymentAmount: s === "honorific" ? 0 : c.paymentAmount
                  }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition ${
                    form.paymentStatus === s
                      ? s === "paid" ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : s === "pending" ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : "border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-300"
                      : "border-border bg-transparent text-ink-soft hover:bg-bg-soft"
                  }`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>

          {form.paymentStatus === "paid" && (
            <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-border border-dashed">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Método de Pago</label>
                <select
                  className="w-full bg-bg-soft border border-border rounded-lg px-3 py-2 text-sm text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  value={form.paymentMethod}
                  onChange={(e) => setForm(c => ({ ...c, paymentMethod: e.target.value }))}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta de Credito">Tarjeta de Crédito</option>
                  <option value="Tarjeta de Debito">Tarjeta de Débito</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Seguro">Seguro Médico</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Monto Cobrado ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full bg-bg-soft border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none font-medium"
                    value={form.paymentAmount === 0 ? "" : form.paymentAmount}
                    onChange={(e) => setForm(c => ({ ...c, paymentAmount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}
          
          {form.paymentStatus === "pending" && (
            <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-200 mt-2">
              Esta consulta se guardará como pendiente de pago. Podrás registrar el cobro más adelante en la sección de Caja.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
export default WizardStepTreatment;
