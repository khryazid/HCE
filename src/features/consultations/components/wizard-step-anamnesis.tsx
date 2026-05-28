"use client";

import { memo, useCallback } from "react";
import type { WizardForm, CurrentMedication } from "@/features/consultations/lib/use-consultation-wizard";
import { MedicationsTable } from "@/features/consultations/components/medications-table";
import { AlertTriangle, Activity, Scissors, Users, Cigarette, Baby, MessageSquare, FileText } from "lucide-react";

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  validationErrors: Record<string, string>;
  uiPreferences?: Record<string, boolean>;
};

const WizardStepAnamnesis = memo(function WizardStepAnamnesis({ form, setForm, validationErrors, uiPreferences }: Props) {
  const handleMedicationsChange = useCallback(
    (meds: CurrentMedication[]) => {
      const pharmacologicalText = meds
        .map((m) => `${m.name} ${m.dose} ${m.frequency} (desde: ${m.since})`)
        .join("\n");
      setForm((c) => ({
        ...c,
        currentMedications: meds,
        backgrounds: { ...c.backgrounds, pharmacological: pharmacologicalText },
      }));
    },
    [setForm],
  );

  const updateBackground = (field: keyof WizardForm["backgrounds"], value: string) => {
    setForm((c) => ({
      ...c,
      backgrounds: {
        ...c.backgrounds,
        [field]: value,
      },
    }));
  };

  /** Al presionar Enter en un campo de antecedentes, inserta "\n• " en la posición del cursor. */
  function handleBulletKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: keyof WizardForm["backgrounds"],
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const insert = "\n\u2022 ";
    const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
    updateBackground(field, next);
    const pos = selectionStart + insert.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }

  /** Al enfocar un campo vacío, agrega el primer bullet automáticamente. */
  function handleBulletFocus(
    e: React.FocusEvent<HTMLTextAreaElement>,
    field: keyof WizardForm["backgrounds"],
  ) {
    if (e.target.value.trim()) return;
    updateBackground(field, "\u2022 ");
    requestAnimationFrame(() => {
      e.target.selectionStart = e.target.selectionEnd = 2;
    });
  }

  return (
    <div className="space-y-8">
      {form.entryMode === "seguimiento" ? (
        <div className="hce-alert-info">
          Modo seguimiento activo. Puedes omitir algunos campos e ir directo a evolución y diagnóstico actual.
        </div>
      ) : null}

      {/* MOTIVO DE CONSULTA Y ENFERMEDAD ACTUAL */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
          A. Motivo de Consulta y Enfermedad Actual
        </h4>

        <div className="space-y-4">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <label htmlFor="field-chiefComplaint" className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
              <MessageSquare className="h-3.5 w-3.5" /> Motivo de consulta <span className="text-red-500">*</span>
            </label>
            <input
              id="field-chiefComplaint"
              className="w-full bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
              placeholder="¿Por qué viene hoy? Ej: Dolor abdominal intenso"
              value={form.chiefComplaint}
              onChange={(e) => setForm((c) => ({ ...c, chiefComplaint: e.target.value }))}
              aria-invalid={!!validationErrors.chiefComplaint}
              aria-describedby={validationErrors.chiefComplaint ? "error-chiefComplaint" : undefined}
            />
            {validationErrors.chiefComplaint ? (
              <p id="error-chiefComplaint" className="absolute -bottom-6 left-1 text-xs font-medium text-red-600">{validationErrors.chiefComplaint}</p>
            ) : null}
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
              <FileText className="h-3.5 w-3.5" /> Enfermedad actual / Anamnesis
            </label>
            <textarea
              className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
              placeholder="Relato cronológico del padecimiento: inicio, duración, características, factores modificadores, síntomas acompañantes..."
              value={form.anamnesis}
              onChange={(e) => setForm((c) => ({ ...c, anamnesis: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* ANTECEDENTES */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-ink border-b border-border pb-2">
          B. Antecedentes Clínicos
        </h4>

        <div className="space-y-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="group relative overflow-hidden rounded-xl border border-red-200 bg-red-50/10 shadow-sm transition-all focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400 dark:border-red-900/30 dark:bg-red-900/10">
              <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-600 transition-colors group-focus-within:text-red-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Alérgicos
              </label>
              <textarea
                className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-red-400/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                placeholder="Alergias a medicamentos, alimentos, ambientales..."
                value={form.backgrounds?.allergic ?? ""}
                onFocus={(e) => handleBulletFocus(e, "allergic")}
                onKeyDown={(e) => handleBulletKeyDown(e, "allergic")}
                onChange={(e) => updateBackground("allergic", e.target.value)}
              />
            </div>

            {uiPreferences?.hide_personal_history !== true && (
              <>
                <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                    <Activity className="h-3.5 w-3.5" />
                    Patológicos (Médicos)
                  </label>
                  <textarea
                    className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                    placeholder="HTA, Diabetes, Asma..."
                    value={form.backgrounds?.pathological ?? ""}
                    onFocus={(e) => handleBulletFocus(e, "pathological")}
                    onKeyDown={(e) => handleBulletKeyDown(e, "pathological")}
                    onChange={(e) => updateBackground("pathological", e.target.value)}
                  />
                </div>

                <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                    <Scissors className="h-3.5 w-3.5" />
                    Quirúrgicos
                  </label>
                  <textarea
                    className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                    placeholder="Cirugías previas..."
                    value={form.backgrounds?.surgical ?? ""}
                    onFocus={(e) => handleBulletFocus(e, "surgical")}
                    onKeyDown={(e) => handleBulletKeyDown(e, "surgical")}
                    onChange={(e) => updateBackground("surgical", e.target.value)}
                  />
                </div>
              </>
            )}

            {uiPreferences?.hide_family_history !== true && (
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Users className="h-3.5 w-3.5" />
                  Familiares
                </label>
                <textarea
                  className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                  placeholder="Padres, abuelos..."
                  value={form.backgrounds?.family ?? ""}
                  onFocus={(e) => handleBulletFocus(e, "family")}
                  onKeyDown={(e) => handleBulletKeyDown(e, "family")}
                  onChange={(e) => updateBackground("family", e.target.value)}
                />
              </div>
            )}

            {uiPreferences?.hide_habits !== true && (
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Cigarette className="h-3.5 w-3.5" />
                  Hábitos / Tóxicos
                </label>
                <textarea
                  className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                  placeholder="Tabaco, alcohol, drogas, sedentarismo..."
                  value={form.backgrounds?.toxic ?? ""}
                  onFocus={(e) => handleBulletFocus(e, "toxic")}
                  onKeyDown={(e) => handleBulletKeyDown(e, "toxic")}
                  onChange={(e) => updateBackground("toxic", e.target.value)}
                />
              </div>
            )}

            {/* Solo visible si el sexo biológico es Mujer y no está oculto por preferencias */}
            {form.gender === "Mujer" && uiPreferences?.hide_female_history !== true && (
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                <label className="absolute left-3 top-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
                  <Baby className="h-3.5 w-3.5" />
                  Gineco-obstétricos
                </label>
                <textarea
                  className="w-full min-h-[140px] resize-none bg-transparent px-3 pb-3 pt-10 text-base text-ink placeholder:text-ink-faint/50 !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
                  placeholder="FUR, Gestas, Partos, Cesáreas, Abortos..."
                  value={form.backgrounds?.gynecoObstetric ?? ""}
                  onFocus={(e) => handleBulletFocus(e, "gynecoObstetric")}
                  onKeyDown={(e) => handleBulletKeyDown(e, "gynecoObstetric")}
                  onChange={(e) => updateBackground("gynecoObstetric", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Farmacológicos (Medicamentos Actuales)</label>
            <MedicationsTable
              medications={form.currentMedications}
              onChange={handleMedicationsChange}
            />
          </div>

          <details className="mt-2 text-base text-ink-soft group">
            <summary className="cursor-pointer font-medium hover:text-ink">Mostrar otros antecedentes (Histórico)</summary>
            <div className="mt-3">
              <textarea
                className="hce-input min-h-16"
                placeholder="Registro histórico sin categorizar..."
                value={form.medicalHistory}
                onChange={(e) => setForm((c) => ({ ...c, medicalHistory: e.target.value }))}
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
});
export default WizardStepAnamnesis;
