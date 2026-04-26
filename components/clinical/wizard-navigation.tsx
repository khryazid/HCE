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
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={step === 1 || saving}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        Anterior
      </button>
      {step < 4 ? (
        <button
          type="button"
          onClick={onNext}
          disabled={saving}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Siguiente
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onSaveWithoutPdf}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar sin PDF"}
          </button>
          <button
            type="button"
            onClick={onOpenPreview}
            disabled={saving}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Previsualizar PDF
          </button>
        </>
      )}
    </div>
  );
}
