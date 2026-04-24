"use client";

type Props = {
  step: number;
  saving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
};

export function WizardNavigation({
  step,
  saving,
  onPrev,
  onNext,
  onComplete,
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
        <button
          type="button"
          onClick={onComplete}
          disabled={saving}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Confirmar, guardar y generar PDF"}
        </button>
      )}
    </div>
  );
}
