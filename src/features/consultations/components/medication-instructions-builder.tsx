"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type MedInstruction = {
  medId: string;
  medName: string;
  medDose: string;
  frequencyPreset: string;
  frequencyCustom: string;
  durationPreset: string;
  durationCustom: string;
  contextChips: string[];
  contextNote: string;
};

// ── Catalogs ───────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: "1-vez-dia", label: "1 vez al día" },
  { value: "cada-12h",  label: "Cada 12 h  (2×/día)" },
  { value: "cada-8h",   label: "Cada 8 h   (3×/día)" },
  { value: "cada-6h",   label: "Cada 6 h   (4×/día)" },
  { value: "cada-4h",   label: "Cada 4 h   (6×/día)" },
  { value: "al-dormir", label: "Al acostarse" },
  { value: "custom",    label: "Personalizado…" },
];

const DURATION_OPTIONS = [
  { value: "3-dias",  label: "3 días" },
  { value: "5-dias",  label: "5 días" },
  { value: "7-dias",  label: "7 días" },
  { value: "10-dias", label: "10 días" },
  { value: "14-dias", label: "14 días" },
  { value: "1-mes",   label: "1 mes" },
  { value: "cronico", label: "Uso crónico (sin fin)" },
  { value: "s-n",     label: "Según necesidad" },
  { value: "custom",  label: "Personalizado…" },
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
      if (dur) parts.push(dur);
      if (chips) parts.push(chips);
      if (note) parts.push(note);
      const nameLabel = [inst.medName, inst.medDose].filter(Boolean).join(" ");
      return `• ${nameLabel}: ${parts.join(", ")}.`;
    })
    .join("\n");
}

/**
 * Parse bullet lines from treatmentPlan text.
 * Returns [{name, dose}] for each non-empty bullet line.
 */
function parseTreatmentPlan(text: string): { name: string; dose: string }[] {
  if (!text.trim()) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      // Try to split "Acetaminofén 500mg" → name="Acetaminofén" dose="500mg"
      const match = line.match(/^(.+?)\s+(\d[\d.,]*\s*(?:mg|g|ml|mcg|UI|un|tab|cap|amp)[\w/]*)$/i);
      if (match) return { name: match[1].trim(), dose: match[2].trim() };
      return { name: line, dose: "" };
    });
}

function makeInstruction(id: string, name: string, dose: string): MedInstruction {
  return {
    medId: id,
    medName: name,
    medDose: dose,
    frequencyPreset: "cada-8h",
    frequencyCustom: "",
    durationPreset: "7-dias",
    durationCustom: "",
    contextChips: [],
    contextNote: "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  /** Free-text prescription plan — parsed automatically to generate cards */
  treatmentPlanText: string;
  /** Structured instructions state */
  value: MedInstruction[];
  onChange: (instructions: MedInstruction[]) => void;
};

export function MedicationInstructionsBuilder({ treatmentPlanText, value, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newDose, setNewDose] = useState("");

  // Sync from treatmentPlan text whenever it changes
  useEffect(() => {
    const parsed = parseTreatmentPlan(treatmentPlanText);
    if (parsed.length === 0) return;

    const next: MedInstruction[] = parsed.map(({ name, dose }) => {
      // Match by normalised name so edits to dose don't reset the instruction settings
      const existing = value.find(
        (i) => i.medName.toLowerCase().trim() === name.toLowerCase().trim(),
      );
      if (existing) return { ...existing, medName: name, medDose: dose || existing.medDose };
      return makeInstruction(crypto.randomUUID(), name, dose);
    });

    // Only push if something changed to avoid loops
    const same =
      next.length === value.length &&
      next.every((n, i) => {
        const v = value[i];
        return v && n.medName === v.medName && n.medDose === v.medDose;
      });

    if (!same) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatmentPlanText]);

  const updateInstruction = useCallback(
    (medId: string, patch: Partial<MedInstruction>) => {
      onChange(value.map((i) => (i.medId === medId ? { ...i, ...patch } : i)));
    },
    [value, onChange],
  );

  const removeInstruction = useCallback(
    (medId: string) => onChange(value.filter((i) => i.medId !== medId)),
    [value, onChange],
  );

  const toggleChip = useCallback(
    (medId: string, chip: string) => {
      const inst = value.find((i) => i.medId === medId);
      if (!inst) return;
      const has = inst.contextChips.includes(chip);
      updateInstruction(medId, {
        contextChips: has ? inst.contextChips.filter((c) => c !== chip) : [...inst.contextChips, chip],
      });
    },
    [value, updateInstruction],
  );

  function addManual() {
    const name = newName.trim();
    if (!name) return;
    const already = value.some((i) => i.medName.toLowerCase() === name.toLowerCase());
    if (!already) {
      onChange([...value, makeInstruction(crypto.randomUUID(), name, newDose.trim())]);
    }
    setNewName("");
    setNewDose("");
  }

  const visibleCards = value.filter((i) => i.medName.trim());

  return (
    <div className="space-y-4">
      {/* Empty state + hint */}
      {visibleCards.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-bg-soft px-4 py-5 text-center">
          <p className="text-sm text-ink-soft">
            Las tarjetas se generan automáticamente desde la receta de arriba.
            <br />
            También puedes agregar un medicamento manualmente abajo.
          </p>
        </div>
      )}

      {/* Instruction cards */}
      {visibleCards.map((inst) => {
        const preview = assembleInstructionText([inst]);
        return (
          <div key={inst.medId} className="rounded-2xl border border-border bg-bg-soft/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 bg-bg-soft px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
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
              <button
                type="button"
                onClick={() => removeInstruction(inst.medId)}
                className="rounded-lg p-1.5 text-ink-soft hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Eliminar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Frequency + Duration */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  {/* AUDIT FIX A-1: htmlFor vinculado al id del select */}
                  <label
                    htmlFor={`freq-${inst.medId}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                  >
                    Frecuencia
                  </label>
                  <select
                    id={`freq-${inst.medId}`}
                    className="hce-input text-sm"
                    value={inst.frequencyPreset}
                    onChange={(e) => updateInstruction(inst.medId, { frequencyPreset: e.target.value, frequencyCustom: "" })}
                  >
                    {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {inst.frequencyPreset === "custom" && (
                    <input
                      id={`freq-custom-${inst.medId}`}
                      className="hce-input text-sm mt-1"
                      placeholder="Ej: Cada 48 horas"
                      value={inst.frequencyCustom}
                      onChange={(e) => updateInstruction(inst.medId, { frequencyCustom: e.target.value })}
                      aria-label="Frecuencia personalizada"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  {/* AUDIT FIX A-1: htmlFor vinculado al id del select */}
                  <label
                    htmlFor={`dur-${inst.medId}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                  >
                    Duración
                  </label>
                  <select
                    id={`dur-${inst.medId}`}
                    className="hce-input text-sm"
                    value={inst.durationPreset}
                    onChange={(e) => updateInstruction(inst.medId, { durationPreset: e.target.value, durationCustom: "" })}
                  >
                    {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {inst.durationPreset === "custom" && (
                    <input
                      id={`dur-custom-${inst.medId}`}
                      className="hce-input text-sm mt-1"
                      placeholder="Ej: 3 semanas"
                      value={inst.durationCustom}
                      onChange={(e) => updateInstruction(inst.medId, { durationCustom: e.target.value })}
                      aria-label="Duración personalizada"
                    />
                  )}
                </div>
              </div>

              {/* Context chips */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">¿Cuándo tomarlo?</label>
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
                  onChange={(e) => updateInstruction(inst.medId, { contextNote: e.target.value })}
                />
              </div>

              {/* Live preview */}
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-1">
                  Vista previa
                </p>
                <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
                  {preview || <span className="text-ink-soft italic">Completa los campos</span>}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Manual add row */}
      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Agregar medicamento manualmente</label>
          <input
            className="hce-input text-sm"
            placeholder="Nombre del medicamento"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
          />
        </div>
        <div className="w-full sm:w-36 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft sm:opacity-0 select-none">Dosis</label>
          <input
            className="hce-input text-sm"
            placeholder="Dosis (opcional)"
            value={newDose}
            onChange={(e) => setNewDose(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
          />
        </div>
        <button
          type="button"
          onClick={addManual}
          disabled={!newName.trim()}
          className="hce-btn-secondary text-sm shrink-0 disabled:opacity-40"
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}
