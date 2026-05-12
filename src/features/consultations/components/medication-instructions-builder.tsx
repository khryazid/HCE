"use client";

import { useEffect, useState, useCallback } from "react";
import type { CurrentMedication } from "@/features/consultations/lib/use-consultation-wizard";

// ── Types ──────────────────────────────────────────────────────────────────────

export type MedInstruction = {
  /** matches CurrentMedication.id */
  medId: string;
  medName: string;
  medDose: string;
  frequencyPreset: string; // e.g. "cada-8h" | "cada-12h" | "1-vez-dia" | "custom"
  frequencyCustom: string; // free text when preset = "custom"
  durationPreset: string;  // e.g. "5-dias" | "7-dias" | "cronico" | "custom"
  durationCustom: string;
  contextChips: string[];  // e.g. ["Con alimentos"]
  contextNote: string;     // extra free text
};

// ── Catalogs ───────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: "1-vez-dia",   label: "1 vez al día" },
  { value: "cada-12h",   label: "Cada 12 h  (2×/día)" },
  { value: "cada-8h",    label: "Cada 8 h   (3×/día)" },
  { value: "cada-6h",    label: "Cada 6 h   (4×/día)" },
  { value: "cada-4h",    label: "Cada 4 h   (6×/día)" },
  { value: "al-dormir",  label: "Al acostarse" },
  { value: "custom",     label: "Personalizado…" },
];

const DURATION_OPTIONS = [
  { value: "3-dias",    label: "3 días" },
  { value: "5-dias",    label: "5 días" },
  { value: "7-dias",    label: "7 días" },
  { value: "10-dias",   label: "10 días" },
  { value: "14-dias",   label: "14 días" },
  { value: "1-mes",     label: "1 mes" },
  { value: "cronico",   label: "Uso crónico (sin fin)" },
  { value: "s-n",       label: "Según necesidad" },
  { value: "custom",    label: "Personalizado…" },
];

const CONTEXT_CHIPS = [
  "En ayunas",
  "Con alimentos",
  "Después del desayuno",
  "Después del almuerzo",
  "Después de la cena",
  "Antes de acostarse",
  "Con agua abundante",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveFrequency(inst: MedInstruction): string {
  if (inst.frequencyPreset === "custom") return inst.frequencyCustom || "";
  return FREQUENCY_OPTIONS.find((o) => o.value === inst.frequencyPreset)?.label ?? "";
}

function resolveDuration(inst: MedInstruction): string {
  if (inst.durationPreset === "cronico") return "de forma continua (uso crónico)";
  if (inst.durationPreset === "s-n") return "según necesidad";
  if (inst.durationPreset === "custom") return `por ${inst.durationCustom}`;
  return `por ${DURATION_OPTIONS.find((o) => o.value === inst.durationPreset)?.label ?? ""}`;
}

export function assembleInstructionText(instructions: MedInstruction[]): string {
  return instructions
    .filter((i) => i.medName.trim())
    .map((inst) => {
      const freq = resolveFrequency(inst);
      const dur = resolveDuration(inst);
      const chips = inst.contextChips.join(", ");
      const note = inst.contextNote.trim();

      const parts: string[] = [];
      if (freq) parts.push(freq);
      if (dur && inst.durationPreset !== "s-n" && inst.durationPreset !== "cronico") parts.push(dur);
      else if (dur) parts.push(dur);
      if (chips) parts.push(chips);
      if (note) parts.push(note);

      const nameLabel = [inst.medName, inst.medDose].filter(Boolean).join(" ");
      return `• ${nameLabel}: ${parts.join(", ")}.`;
    })
    .join("\n");
}

function buildDefault(med: CurrentMedication): MedInstruction {
  // Try to pre-fill from the medication's existing frequency text
  let preset = "cada-8h";
  const f = (med.frequency || "").toLowerCase();
  if (f.includes("12")) preset = "cada-12h";
  else if (f.includes("8"))  preset = "cada-8h";
  else if (f.includes("6"))  preset = "cada-6h";
  else if (f.includes("4"))  preset = "cada-4h";
  else if (f.includes("1 vez") || f.includes("una vez") || f.includes("qd")) preset = "1-vez-dia";
  else if (f.includes("dormir") || f.includes("noche") || f.includes("acosta")) preset = "al-dormir";
  else if (f.trim()) preset = "custom";

  return {
    medId: med.id,
    medName: med.name,
    medDose: med.dose,
    frequencyPreset: preset,
    frequencyCustom: preset === "custom" ? med.frequency : "",
    durationPreset: "7-dias",
    durationCustom: "",
    contextChips: [],
    contextNote: "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  medications: CurrentMedication[];
  /** Structured instructions — persisted in specialty_data */
  value: MedInstruction[];
  onChange: (instructions: MedInstruction[]) => void;
};

export function MedicationInstructionsBuilder({ medications, value, onChange }: Props) {
  // Sync: when medications change, add missing entries / remove stale ones
  useEffect(() => {
    if (medications.length === 0) return;

    const next = medications
      .filter((m) => m.name.trim()) // ignore empty rows
      .map((med) => {
        const existing = value.find((i) => i.medId === med.id);
        if (existing) {
          // Keep existing but refresh name/dose in case they changed
          return { ...existing, medName: med.name, medDose: med.dose };
        }
        return buildDefault(med);
      });

    // Only update if something actually changed (avoid render loops)
    const changed =
      next.length !== value.length ||
      next.some((n, idx) => {
        const v = value[idx];
        return !v || n.medId !== v.medId || n.medName !== v.medName || n.medDose !== v.medDose;
      });

    if (changed) onChange(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications]);

  const updateInstruction = useCallback(
    (medId: string, patch: Partial<MedInstruction>) => {
      onChange(value.map((i) => (i.medId === medId ? { ...i, ...patch } : i)));
    },
    [value, onChange],
  );

  const toggleChip = useCallback(
    (medId: string, chip: string) => {
      const inst = value.find((i) => i.medId === medId);
      if (!inst) return;
      const has = inst.contextChips.includes(chip);
      updateInstruction(medId, {
        contextChips: has
          ? inst.contextChips.filter((c) => c !== chip)
          : [...inst.contextChips, chip],
      });
    },
    [value, updateInstruction],
  );

  if (medications.filter((m) => m.name.trim()).length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg-soft px-4 py-6 text-center">
        <p className="text-sm text-ink-soft">
          Agrega medicamentos en la tabla de arriba y aquí aparecerán las instrucciones de posología.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {value.filter((inst) => inst.medName.trim()).map((inst) => {
        const preview = assembleInstructionText([inst]);

        return (
          <div
            key={inst.medId}
            className="rounded-2xl border border-border bg-bg-soft/50 overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center gap-3 bg-bg-soft px-4 py-3 border-b border-border">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-sm">
                Rx
              </div>
              <div>
                <p className="text-sm font-bold text-ink">
                  {inst.medName}
                  {inst.medDose && (
                    <span className="ml-2 text-xs font-semibold text-ink-soft">{inst.medDose}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Card body */}
            <div className="p-4 space-y-4">
              {/* Frequency */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    Frecuencia
                  </label>
                  <select
                    className="hce-input text-sm"
                    value={inst.frequencyPreset}
                    onChange={(e) =>
                      updateInstruction(inst.medId, {
                        frequencyPreset: e.target.value,
                        frequencyCustom: "",
                      })
                    }
                  >
                    {FREQUENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {inst.frequencyPreset === "custom" && (
                    <input
                      className="hce-input text-sm mt-1"
                      placeholder="Ej: Cada 48 horas"
                      value={inst.frequencyCustom}
                      onChange={(e) =>
                        updateInstruction(inst.medId, { frequencyCustom: e.target.value })
                      }
                    />
                  )}
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    Duración
                  </label>
                  <select
                    className="hce-input text-sm"
                    value={inst.durationPreset}
                    onChange={(e) =>
                      updateInstruction(inst.medId, {
                        durationPreset: e.target.value,
                        durationCustom: "",
                      })
                    }
                  >
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {inst.durationPreset === "custom" && (
                    <input
                      className="hce-input text-sm mt-1"
                      placeholder="Ej: 3 semanas"
                      value={inst.durationCustom}
                      onChange={(e) =>
                        updateInstruction(inst.medId, { durationCustom: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>

              {/* Context chips */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                  ¿Cuándo tomarlo?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTEXT_CHIPS.map((chip) => {
                    const active = inst.contextChips.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleChip(inst.medId, chip)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                          active
                            ? "border-teal-500/50 bg-teal-500/10 text-teal-800 dark:text-teal-300"
                            : "border-border bg-card text-ink-soft hover:bg-bg-soft hover:text-ink"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
                <input
                  className="hce-input text-sm"
                  placeholder="Nota adicional (opcional)…"
                  value={inst.contextNote}
                  onChange={(e) =>
                    updateInstruction(inst.medId, { contextNote: e.target.value })
                  }
                />
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-1">
                  Vista previa
                </p>
                <p className="text-xs text-ink leading-relaxed">
                  {preview || <span className="text-ink-soft italic">Completa los campos para ver la instrucción</span>}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
