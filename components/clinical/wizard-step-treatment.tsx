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
    <div className="space-y-4">
      {form.entryMode === "consulta" ? (
        <>
          <select
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.treatmentTemplateId}
            onChange={(event) => onApplyTemplate(event.target.value)}
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
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                treatmentPlan: event.target.value,
              }))
            }
          />
          {validationErrors.treatmentPlan ? (
            <p className="-mt-2 text-sm font-medium text-red-600">{validationErrors.treatmentPlan}</p>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          En seguimiento el tratamiento previo se conserva y solo se registra
          evolucion/control.
        </div>
      )}
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder="Estado de evolucion (opcional)"
        value={form.evolutionStatus}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            evolutionStatus: event.target.value,
          }))
        }
      />
      {validationErrors.evolutionStatus ? (
        <p className="-mt-2 text-sm font-medium text-red-600">{validationErrors.evolutionStatus}</p>
      ) : null}
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
  );
}
