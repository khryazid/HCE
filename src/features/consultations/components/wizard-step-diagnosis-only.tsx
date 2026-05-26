"use client";

import { memo } from "react";

import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";
import { APP_NAME } from "@/lib/constants/app";

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  validationErrors: Record<string, string>;
  triggerMagicCieFill: () => void;
};

const WizardStepDiagnosisOnly = memo(function WizardStepDiagnosisOnly({
  form,
  setForm,
  validationErrors,
  triggerMagicCieFill,
}: Props) {
  return (
    <div className="space-y-6">
      <p className="text-[11px] text-ink-soft">
        El diagnóstico se establece <strong>después</strong> del Examen Físico, siguiendo el método clínico estándar.
        Los campos a continuación constituyen el bloque diagnóstico definitivo del acto médico.
      </p>

      {/* Análisis Clínico */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink">Análisis Clínico / Razonamiento</label>
        <textarea
          className="hce-input min-h-20"
          placeholder="Justificación del diagnóstico basada en los hallazgos de anamnesis, revisión por sistemas y examen físico..."
          value={form.clinicalAnalysis}
          onChange={(e) => setForm((c) => ({ ...c, clinicalAnalysis: e.target.value }))}
        />
      </div>

      {/* Impresión Diagnóstica + CIE-10 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Impresión Diagnóstica <span className="text-red-500">*</span>
          </label>
          <textarea
            id="field-diagnosis"
            className="hce-input min-h-20"
            placeholder="Ej: Apendicitis aguda no complicada"
            value={form.diagnosis}
            onChange={(e) => setForm((c) => ({ ...c, diagnosis: e.target.value }))}
            onBlur={triggerMagicCieFill}
            aria-invalid={!!validationErrors.diagnosis}
            aria-describedby={validationErrors.diagnosis ? "error-diagnosis" : undefined}
          />
          {validationErrors.diagnosis ? (
            <p id="error-diagnosis" className="text-sm font-medium text-red-600">{validationErrors.diagnosis}</p>
          ) : null}
          <p className="text-[10px] text-ink-soft">
            Al perder el foco, {APP_NAME} intentará sugerir el código CIE-10 automáticamente.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Códigos CIE-10 / CIE-11</label>
          <textarea
            className="hce-input min-h-20"
            placeholder="Codificación formal. Ej: K35.8 — Apendicitis aguda"
            value={form.cieCodes}
            onChange={(e) => setForm((c) => ({ ...c, cieCodes: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
});
export default WizardStepDiagnosisOnly;
