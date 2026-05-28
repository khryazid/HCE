"use client";

import { memo, useCallback } from "react";
import type { WizardForm, ReviewOfSystemEntry } from "@/features/consultations/lib/use-consultation-wizard";

type SystemKey = keyof WizardForm["reviewOfSystems"];

const SYSTEMS: {
  key: SystemKey;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "cardiovascular",
    label: "❤️ Cardiovascular",
    placeholder: "Palpitaciones, disnea de esfuerzo, ortopnea, edemas, dolor precordial...",
  },
  {
    key: "respiratory",
    label: "🫁 Respiratorio",
    placeholder: "Tos, expectoración, hemoptisis, disnea, sibilancias, dolor pleurítico...",
  },
  {
    key: "gastrointestinal",
    label: "🩺 Gastrointestinal",
    placeholder: "Náuseas, vómitos, disfagia, pirosis, dolor abdominal, cambios de hábito...",
  },
  {
    key: "genitourinary",
    label: "💧 Genitourinario",
    placeholder: "Disuria, polaquiuria, hematuria, incontinencia, secreciones...",
  },
  {
    key: "neurological",
    label: "🧠 Neurológico",
    placeholder: "Cefalea, mareos, síncope, convulsiones, déficit motor o sensitivo...",
  },
  {
    key: "musculoskeletal",
    label: "🦴 Musculoesquelético",
    placeholder: "Dolor articular, rigidez matutina, limitación funcional, edema articular...",
  },
  {
    key: "dermatological",
    label: "🖐️ Dermatológico",
    placeholder: "Lesiones cutáneas, prurito, cambios de coloración, alopecia...",
  },
  {
    key: "endocrine",
    label: "🦋 Endocrinológico",
    placeholder: "Polidipsia, poliuria, cambios de peso, intolerancia al frío/calor...",
  },
  {
    key: "psychiatric",
    label: "🎭 Psiquiátrico",
    placeholder: "Cambios de humor, ansiedad, insomnio, alucinaciones, ideas suicidas...",
  },
  {
    key: "hematological",
    label: "🩸 Hematológico",
    placeholder: "Sangrados fáciles, equimosis, petequias, adenopatías, palidez...",
  },
];

type Props = {
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  uiPreferences?: Record<string, boolean>;
  onToggleSection?: (key: string) => void;
};

type SystemRowProps = {
  systemKey: SystemKey;
  label: string;
  placeholder: string;
  entry: ReviewOfSystemEntry;
  onToggle: (key: SystemKey) => void;
  onNotesChange: (key: SystemKey, notes: string) => void;
};

const SystemRow = memo(function SystemRow({
  systemKey,
  label,
  placeholder,
  entry,
  onToggle,
  onNotesChange,
}: SystemRowProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-soft overflow-hidden transition-colors">
      <button
        type="button"
        aria-pressed={entry.present}
        onClick={() => onToggle(systemKey)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
          entry.present
            ? "border-accent/30 bg-accent/10"
            : "hover:bg-card"
        }`}
      >
        <span className={`text-sm font-medium ${entry.present ? "text-accent" : "text-ink"}`}>
          {label}
        </span>
        <span
          className={`flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            entry.present
              ? "bg-accent/20 border border-accent/40 text-accent"
              : "bg-bg-soft border border-border text-ink-soft"
          }`}
        >
          {entry.present ? "!" : "—"}
        </span>
      </button>

      {entry.present && (
        <div className="px-4 pb-3 pt-1 bg-bg-soft border-t border-border">
          <textarea
            className="hce-input min-h-16 text-sm "
            placeholder={placeholder}
            value={entry.notes}
            onChange={(e) => onNotesChange(systemKey, e.target.value)}
          />
        </div>
      )}
    </div>
  );
});

export const WizardStepReviewOfSystems = memo(function WizardStepReviewOfSystems({ 
  form, 
  setForm,
  uiPreferences,
  onToggleSection
}: Props) {
  const ros = form.reviewOfSystems;
  const activeCount = Object.values(ros).filter((s) => s.present).length;

  const handleToggle = useCallback((key: SystemKey) => {
    setForm((c) => ({
      ...c,
      reviewOfSystems: {
        ...c.reviewOfSystems,
        [key]: { ...c.reviewOfSystems[key], present: !c.reviewOfSystems[key].present },
      },
    }));
  }, [setForm]);

  const handleNotesChange = useCallback((key: SystemKey, notes: string) => {
    setForm((c) => ({
      ...c,
      reviewOfSystems: {
        ...c.reviewOfSystems,
        [key]: { ...c.reviewOfSystems[key], notes },
      },
    }));
  }, [setForm]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-ink">
              Cuestionario por Sistemas
            </h4>
            <span className="text-xs text-ink-soft bg-bg-soft px-2 py-0.5 rounded-full border border-border">
              {activeCount} sistema{activeCount !== 1 ? "s" : ""} con hallazgos
            </span>
          </div>
          {onToggleSection && (
            <button
              type="button"
              onClick={() => onToggleSection("hide_ros_details")}
              className="text-xs uppercase font-bold tracking-wider text-ink-soft hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors bg-bg-soft px-2.5 py-1 rounded-md flex items-center gap-1.5"
            >
              {uiPreferences?.hide_ros_details ? (
                <><span>👁️</span> Mostrar</>
              ) : (
                <><span>🙈</span> Ocultar</>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-ink-soft">
          Activa los sistemas que presentan síntomas o hallazgos relevantes.
          Los sistemas no activados se registrarán como &quot;sin alteraciones aparentes&quot;.
        </p>
      </div>

      {uiPreferences?.hide_ros_details !== true && (
        <div className="grid gap-2 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {SYSTEMS.map(({ key, label, placeholder }) => (
            <SystemRow
              key={key}
              systemKey={key}
              label={label}
              placeholder={placeholder}
              entry={ros[key]}
              onToggle={handleToggle}
              onNotesChange={handleNotesChange}
            />
          ))}
        </div>
      )}
    </div>
  );
});
