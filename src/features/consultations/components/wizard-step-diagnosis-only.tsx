"use client";

import { memo } from "react";
import { BrainCircuit, ClipboardList, Tags } from "lucide-react";
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
      <p className="text-base text-ink-soft">
        El diagnóstico se establece <strong>después</strong> del Examen Físico, siguiendo el método clínico estándar.
        Los campos a continuación constituyen el bloque diagnóstico definitivo del acto médico.
      </p>

      {/* Análisis Clínico */}
      <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
          <BrainCircuit className="h-3.5 w-3.5" /> Análisis Clínico / Razonamiento
        </label>
        <textarea
          className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
          placeholder="Justificación del diagnóstico basada en los hallazgos de anamnesis, revisión por sistemas y examen físico..."
          value={form.clinicalAnalysis}
          onChange={(e) => setForm((c) => ({ ...c, clinicalAnalysis: e.target.value }))}
        />
      </div>

      {/* Impresión Diagnóstica + CIE-11 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <label htmlFor="field-diagnosis" className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
            <ClipboardList className="h-3.5 w-3.5" /> Impresión Diagnóstica <span className="text-red-500">*</span>
          </label>
          <textarea
            id="field-diagnosis"
            className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
            placeholder="Ej: Apendicitis aguda no complicada"
            value={form.diagnosis}
            onChange={(e) => setForm((c) => ({ ...c, diagnosis: e.target.value }))}
            onBlur={triggerMagicCieFill}
            aria-invalid={!!validationErrors.diagnosis}
            aria-describedby={validationErrors.diagnosis ? "error-diagnosis" : undefined}
          />
          {validationErrors.diagnosis ? (
            <p id="error-diagnosis" className="absolute -bottom-6 left-1 text-xs font-medium text-red-600">{validationErrors.diagnosis}</p>
          ) : null}
          <p className="absolute bottom-2 right-3 text-base text-ink-soft opacity-70">
            {APP_NAME} sugerirá CIE-11 automáticamente al salir.
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
            <Tags className="h-3.5 w-3.5" /> Códigos CIE-11
          </label>
          <textarea
            className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
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
