"use client";

import { buildPdfLines } from "@/lib/consultations/pdf";
import type { LetterheadSettings } from "@/lib/local-data/letterhead";
import type { ConsultationPdfPreviewData } from "@/lib/consultations/use-consultation-wizard";

type Props = {
  open: boolean;
  data: ConsultationPdfPreviewData | null;
  letterhead: LetterheadSettings;
  saving: boolean;
  onClose: () => void;
  onConfirmGenerate: () => void;
};

export function WizardPdfPreviewModal({
  open,
  data,
  letterhead,
  saving,
  onClose,
  onConfirmGenerate,
}: Props) {
  if (!open) {
    return null;
  }

  const lines = data ? buildPdfLines(letterhead, data) : [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Previsualizacion del PDF</h3>
          <p className="mt-1 text-sm text-slate-600">
            Revisa los datos antes de generar el archivo.
          </p>
        </header>

        <div className="max-h-[60vh] overflow-auto bg-slate-50 px-5 py-4">
          {lines.length === 0 ? (
            <p className="rounded-xl bg-white p-3 text-sm text-slate-600">
              No hay datos suficientes para previsualizar.
            </p>
          ) : (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              {lines.map((line) => (
                <p key={line} className="text-sm text-slate-700">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onConfirmGenerate}
            disabled={saving || !data}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Generando..." : "Guardar y generar PDF"}
          </button>
        </footer>
      </section>
    </div>
  );
}
