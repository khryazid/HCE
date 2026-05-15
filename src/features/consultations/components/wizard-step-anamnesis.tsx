"use client";

import { useCallback } from "react";
import type { WizardForm, CurrentMedication } from "@/features/consultations/lib/use-consultation-wizard";
import { MedicationsTable } from "@/features/consultations/components/medications-table";

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  validationErrors: Record<string, string>;
  uiPreferences?: Record<string, boolean>;
};

export function WizardStepAnamnesis({ form, setForm, validationErrors, uiPreferences }: Props) {
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
        <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-400 border-b border-teal-100 dark:border-teal-500/30 pb-2">
          A. Motivo de Consulta y Enfermedad Actual
        </h4>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Motivo de consulta <span className="text-red-500">*</span>
          </label>
          <input
            id="field-chiefComplaint"
            className="hce-input"
            placeholder="¿Por qué viene hoy? Ej: Dolor abdominal intenso"
            value={form.chiefComplaint}
            onChange={(e) => setForm((c) => ({ ...c, chiefComplaint: e.target.value }))}
          />
          {validationErrors.chiefComplaint ? (
            <p className="text-sm font-medium text-red-600">{validationErrors.chiefComplaint}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Enfermedad actual / Anamnesis</label>
          <textarea
            className="hce-input min-h-24"
            placeholder="Relato cronológico del padecimiento: inicio, duración, características, factores modificadores, síntomas acompañantes..."
            value={form.anamnesis}
            onChange={(e) => setForm((c) => ({ ...c, anamnesis: e.target.value }))}
          />
        </div>
      </div>

      {/* ANTECEDENTES */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-400 border-b border-teal-100 dark:border-teal-500/30 pb-2">
          B. Antecedentes Clínicos
        </h4>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-red-600">Alérgicos</label>
              <textarea
                className="hce-input min-h-16 border-red-200 bg-red-50/30 focus:border-red-400 focus:ring-red-400"
                placeholder="Alergias a medicamentos, alimentos, ambientales..."
                value={form.backgrounds?.allergic ?? ""}
                onFocus={(e) => handleBulletFocus(e, "allergic")}
                onKeyDown={(e) => handleBulletKeyDown(e, "allergic")}
                onChange={(e) => updateBackground("allergic", e.target.value)}
              />
            </div>

            {uiPreferences?.hide_personal_history !== true && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Patológicos (Médicos)</label>
                  <textarea
                    className="hce-input min-h-16"
                    placeholder="HTA, Diabetes, Asma..."
                    value={form.backgrounds?.pathological ?? ""}
                    onFocus={(e) => handleBulletFocus(e, "pathological")}
                    onKeyDown={(e) => handleBulletKeyDown(e, "pathological")}
                    onChange={(e) => updateBackground("pathological", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Quirúrgicos</label>
                  <textarea
                    className="hce-input min-h-16"
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
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Familiares</label>
                <textarea
                  className="hce-input min-h-16"
                  placeholder="Padres, abuelos..."
                  value={form.backgrounds?.family ?? ""}
                  onFocus={(e) => handleBulletFocus(e, "family")}
                  onKeyDown={(e) => handleBulletKeyDown(e, "family")}
                  onChange={(e) => updateBackground("family", e.target.value)}
                />
              </div>
            )}

            {uiPreferences?.hide_habits !== true && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Hábitos / Tóxicos</label>
                <textarea
                  className="hce-input min-h-16"
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
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Gineco-obstétricos</label>
                <textarea
                  className="hce-input min-h-16"
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

          <details className="mt-2 text-sm text-ink-soft group">
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
}
