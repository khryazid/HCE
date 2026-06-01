/**
 * pdf-section-selector.ts
 *
 * Types, constants, and presets for the PDF section selector.
 * The selector allows the doctor to choose which sections to include
 * in the generated PDF: full history, recipe only, lab orders only, etc.
 */

// ─── Section Keys ─────────────────────────────────────────────────────────────

/** Granular sections that can be individually toggled. */
export type PdfSectionKey =
  | "patient_info"      // Patient demographics (name, doc, gender, etc.)
  | "chief_complaint"   // Motivo de consulta + anamnesis
  | "medical_history"   // Antecedentes
  | "vital_signs"       // Signos vitales
  | "physical_exam"     // Examen físico
  | "diagnosis"         // Diagnóstico + CIE-11
  | "treatment_plan"    // Plan de tratamiento
  | "prescription"      // Receta médica (medicamentos + instrucciones)
  | "recommendations"   // Recomendaciones + signos de alarma
  | "lab_orders"        // Órdenes de laboratorio
  | "imaging_orders"    // Órdenes de imagenología
  | "follow_up";        // Próximo control

export type PdfSectionConfig = {
  key: PdfSectionKey;
  label: string;
  checked: boolean;
};

/** Preset identifiers for quick selection. */
export type PdfPresetKey =
  | "full"               // Historia completa — todas las secciones
  | "recipe"             // Solo receta médica
  | "lab_orders"         // Solo órdenes de laboratorio
  | "imaging_orders"     // Solo imagenología
  | "custom";            // Selección personalizada (no activa un preset)

// ─── Constants ────────────────────────────────────────────────────────────────

/** All available sections with their display labels. */
export const ALL_SECTIONS: PdfSectionConfig[] = [
  { key: "patient_info", label: "Datos del paciente", checked: true },
  { key: "chief_complaint", label: "Motivo de consulta", checked: true },
  { key: "medical_history", label: "Antecedentes", checked: true },
  { key: "vital_signs", label: "Signos vitales", checked: true },
  { key: "physical_exam", label: "Examen físico", checked: true },
  { key: "diagnosis", label: "Diagnóstico", checked: true },
  { key: "treatment_plan", label: "Plan de tratamiento", checked: true },
  { key: "prescription", label: "Receta médica", checked: true },
  { key: "recommendations", label: "Recomendaciones", checked: true },
  { key: "lab_orders", label: "Órdenes de laboratorio", checked: true },
  { key: "imaging_orders", label: "Imagenología", checked: true },
  { key: "follow_up", label: "Próximo control", checked: true },
];

/** Which sections each preset activates. */
const PDF_PRESETS: Record<Exclude<PdfPresetKey, "custom">, PdfSectionKey[]> = {
  full: ALL_SECTIONS.map((s) => s.key),
  recipe: ["patient_info", "prescription", "recommendations"],
  lab_orders: ["patient_info", "lab_orders"],
  imaging_orders: ["patient_info", "imaging_orders"],
};

/** Display labels for presets (used in the UI buttons). */
export const PRESET_LABELS: Record<Exclude<PdfPresetKey, "custom">, string> = {
  full: "Historia completa",
  recipe: "Receta médica",
  lab_orders: "Laboratorio",
  imaging_orders: "Imagenología",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Apply a preset to the section list (returns new array). */
export function applySectionPreset(
  preset: Exclude<PdfPresetKey, "custom">,
): PdfSectionConfig[] {
  const activeKeys = new Set(PDF_PRESETS[preset]);
  return ALL_SECTIONS.map((s) => ({ ...s, checked: activeKeys.has(s.key) }));
}

/** Toggle a single section in the list (returns new array). */
export function toggleSection(
  sections: PdfSectionConfig[],
  key: PdfSectionKey,
): PdfSectionConfig[] {
  return sections.map((s) =>
    s.key === key ? { ...s, checked: !s.checked } : s,
  );
}

/** Get the set of enabled section keys from a config list. */
export function getEnabledSections(
  sections: PdfSectionConfig[],
): Set<PdfSectionKey> {
  return new Set(sections.filter((s) => s.checked).map((s) => s.key));
}
