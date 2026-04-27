"use client";

import type { TreatmentTemplate } from "@/lib/local-data/treatments";
import type { WizardForm } from "@/lib/consultations/use-consultation-wizard";

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
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                treatmentPlan: event.target.value,
              }))
            }
          />
          {validationErrors.treatmentPlan ? (
            <p className="text-sm font-medium text-red-600">{validationErrors.treatmentPlan}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Recomendaciones Generales</label>
          <textarea
            className="hce-input min-h-20"
            placeholder="Dieta, reposo, cuidados en casa..."
            value={form.recommendations}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                recommendations: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Signos de Alarma</label>
          <textarea
            className="hce-input min-h-20"
            placeholder="Acudir a urgencias en caso de..."
            value={form.warningSigns}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                warningSigns: event.target.value,
              }))
            }
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
            type="date"
            value={form.nextFollowUpDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                nextFollowUpDate: event.target.value,
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
