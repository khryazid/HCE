"use client";

import { ChipSelector } from "@/features/consultations/components/chip-selector";
import type { TreatmentTemplate } from "@/features/consultations/lib/treatments";
import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";

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
  onApplyTemplate: (templateId: string) => void;
};

export function WizardStepTreatment({
  form,
  setForm,
  templates,
  validationErrors,
  onApplyTemplate,
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
        <h4 className="text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">D. Plan de Manejo</h4>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Plantilla de Prescripción Rápida</label>
          <select
            className="hce-input"
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

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Prescripción Médica (Receta) <span className="text-red-500">*</span></label>
          <textarea
            className="hce-input min-h-32"
            placeholder="Medicamento, Dosis, Vía de administración, Frecuencia y Duración..."
            value={form.treatmentPlan}
            onFocus={(e) => handleBulletFocus(e, "treatmentPlan")}
            onKeyDown={(e) => handleBulletKeyDown(e, "treatmentPlan")}
            onChange={(event) => updateField("treatmentPlan", event.target.value)}
          />
          {validationErrors.treatmentPlan ? (
            <p className="text-sm font-medium text-red-600">{validationErrors.treatmentPlan}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink">Instrucciones de Uso para el Paciente</label>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">Hoja del paciente</span>
          </div>
          <p className="text-[11px] text-ink-soft">La receta queda en la farmacia — aquí el paciente lleva cómo tomar su medicación.</p>
          <textarea
            className="hce-input min-h-24"
            placeholder="Ej: Tomar Ibuprofeno después de las comidas. Omeprazol en ayunas 30 min antes del desayuno..."
            value={form.medicationInstructions}
            onFocus={(e) => {
              if (e.target.value.trim()) return;
              setForm(c => ({ ...c, medicationInstructions: "• " }));
              requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = 2; });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const ta = e.currentTarget;
              const { selectionStart, selectionEnd, value } = ta;
              const insert = "\n• ";
              const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
              setForm(c => ({ ...c, medicationInstructions: next }));
              const pos = selectionStart + insert.length;
              requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos; });
            }}
            onChange={(event) => setForm(c => ({ ...c, medicationInstructions: event.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Recomendaciones Generales</label>
          <textarea
            className="hce-input min-h-20"
            placeholder="Dieta, reposo, cuidados en casa..."
            value={form.recommendations}
            onFocus={(e) => handleBulletFocus(e, "recommendations")}
            onKeyDown={(e) => handleBulletKeyDown(e, "recommendations")}
            onChange={(event) => updateField("recommendations", event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Signos de Alarma</label>
          <textarea
            className="hce-input min-h-20"
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
        <h4 className="text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">E. Paraclínicos Solicitados</h4>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Órdenes de Laboratorio</label>
          <p className="text-[11px] text-ink-soft">Selecciona del catálogo o escribe uno personalizado y presiona Enter.</p>
          <ChipSelector
            catalog={LAB_CATALOG}
            selected={form.labOrders}
            onChange={(next) => setForm((c) => ({ ...c, labOrders: next }))}
            placeholder="Ej: Perfil tiroideo completo..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Estudios de Imagen</label>
          <p className="text-[11px] text-ink-soft">Selecciona del catálogo o escribe uno personalizado y presiona Enter.</p>
          <ChipSelector
            catalog={IMAGING_CATALOG}
            selected={form.imagingOrders}
            onChange={(next) => setForm((c) => ({ ...c, imagingOrders: next }))}
            placeholder="Ej: Rx de pie derecho AP y lateral..."
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-teal-900 border-b border-teal-100 pb-2">E. Evolución y Próximo Control</h4>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Evolución Clínica {form.entryMode === "seguimiento" && <span className="text-red-500">*</span>}
          </label>
          <textarea
            className="hce-input min-h-20"
            placeholder="¿Cómo se encuentra el paciente hoy respecto al tratamiento instaurado?"
            value={form.evolutionStatus}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                evolutionStatus: event.target.value,
              }))
            }
          />
          {validationErrors.evolutionStatus ? (
            <p className="text-sm font-medium text-red-600">{validationErrors.evolutionStatus}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Próximo Control (Cita Médica)</label>
          <input
            className="hce-input"
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
  );
}
