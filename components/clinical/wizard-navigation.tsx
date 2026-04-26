"use client";

type Props = {
  step: number;
  saving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveWithoutPdf: () => void;
  onOpenPreview: () => void;
};

export function WizardNavigation({
  step,
  saving,
  onPrev,
  onNext,
  onSaveWithoutPdf,
  onOpenPreview,
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={onPrev}
        disabled={step === 1 || saving}
        className="hce-btn-secondary"
      >
        Anterior
      </button>
      {step < 4 ? (
        <button
          type="button"
          onClick={onNext}
          disabled={saving}
          className="hce-btn-primary"
        >
          Siguiente
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onSaveWithoutPdf}
            disabled={saving}
            className="hce-btn-secondary"
          >
            {saving ? "Guardando..." : "Guardar sin PDF"}
          </button>
          <button
            type="button"
            onClick={onOpenPreview}
            disabled={saving}
            className="hce-btn-primary"
          >
            Previsualizar PDF
          </button>
        </>
      )}
    </div>
  );
}
