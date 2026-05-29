"use client";

/**
 * PdfSectionSelectorModal
 *
 * A dialog that lets the doctor choose which sections to include in the PDF.
 * Offers quick presets (Full, Recipe, Lab, Imaging) and a custom checklist.
 *
 * Usage:
 *   <PdfSectionSelectorModal
 *     open={showSelector}
 *     isGenerating={isPdfGenerating}
 *     onClose={() => setShowSelector(false)}
 *     onGenerate={(sections) => handlePdfGenerate(sections)}
 *   />
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { X, FileDown } from "lucide-react";
import {
  type PdfSectionConfig,
  type PdfPresetKey,
  type PdfSectionKey,
  ALL_SECTIONS,
  PRESET_LABELS,
  applySectionPreset,
  toggleSection,
  getEnabledSections,
} from "@/features/consultations/lib/pdf/pdf-section-selector";

type Props = {
  open: boolean;
  isGenerating: boolean;
  onClose: () => void;
  onGenerate: (enabledSections: Set<PdfSectionKey>) => void;
};

const PRESETS: Exclude<PdfPresetKey, "custom">[] = [
  "full",
  "recipe",
  "lab_orders",
  "imaging_orders",
];

export function PdfSectionSelectorModal({
  open,
  isGenerating,
  onClose,
  onGenerate,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sections, setSections] = useState<PdfSectionConfig[]>(() =>
    ALL_SECTIONS.map((s) => ({ ...s })),
  );
  const [activePreset, setActivePreset] =
    useState<Exclude<PdfPresetKey, "custom"> | "custom">("full");

  // Sync the open prop with native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Handle Escape (native dialog fires "cancel")
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const handlePreset = useCallback(
    (preset: Exclude<PdfPresetKey, "custom">) => {
      setActivePreset(preset);
      setSections(applySectionPreset(preset));
    },
    [],
  );

  const handleToggle = useCallback((key: PdfSectionKey) => {
    setActivePreset("custom");
    setSections((prev) => toggleSection(prev, key));
  }, []);

  const handleGenerate = useCallback(() => {
    onGenerate(getEnabledSections(sections));
  }, [sections, onGenerate]);

  const enabledCount = sections.filter((s) => s.checked).length;

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="gx-profile-overlay"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div
        className="gx-profile-overlay-content"
        style={{ maxWidth: 440 }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="gx-profile-overlay-close"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div style={{ padding: "24px 24px 16px" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.125rem",
              fontWeight: 800,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            Generar PDF
          </h2>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--ink-soft)",
              marginTop: 4,
            }}
          >
            Elige qué secciones incluir en el documento.
          </p>
        </div>

        {/* Preset buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "0 24px 16px",
          }}
        >
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className={`gx-filter ${activePreset === preset ? "gx-filter-on" : ""}`}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>

        {/* Section checklist */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {sections.map((section) => (
            <label
              key={section.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 24px",
                cursor: "pointer",
                fontSize: "0.8125rem",
                color: "var(--ink)",
                transition: "background 100ms ease",
                background: section.checked
                  ? "var(--accent-dim)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!section.checked)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--bg-soft)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  section.checked ? "var(--accent-dim)" : "transparent";
              }}
            >
              <input
                type="checkbox"
                checked={section.checked}
                onChange={() => handleToggle(section.key)}
                style={{
                  accentColor: "var(--accent)",
                  width: 16,
                  height: 16,
                  cursor: "pointer",
                }}
              />
              <span style={{ fontWeight: section.checked ? 600 : 400 }}>
                {section.label}
              </span>
            </label>
          ))}
        </div>

        {/* Footer with generate button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px 20px",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--ink-faint)",
              fontFamily: "var(--font-mono)",
              fontFeatureSettings: '"tnum"',
            }}
          >
            {enabledCount}/{sections.length} secciones
          </span>

          <button
            type="button"
            disabled={enabledCount === 0 || isGenerating}
            onClick={handleGenerate}
            className="hce-btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: enabledCount === 0 ? 0.5 : 1,
            }}
          >
            <FileDown className="h-4 w-4" />
            {isGenerating ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
