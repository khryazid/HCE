"use client";

import { memo, useCallback } from "react";
import type { CurrentMedication } from "@/features/consultations/lib/use-consultation-wizard";

type Props = {
  medications: CurrentMedication[];
  onChange: (medications: CurrentMedication[]) => void;
};

export const MedicationsTable = memo(function MedicationsTable({ medications, onChange }: Props) {
  const addRow = useCallback(() => {
    const newMed: CurrentMedication = {
      id: crypto.randomUUID(),
      name: "",
      dose: "",
      frequency: "",
      since: "",
    };
    onChange([...medications, newMed]);
  }, [medications, onChange]);

  const removeRow = useCallback((id: string) => {
    onChange(medications.filter((m) => m.id !== id));
  }, [medications, onChange]);

  const updateField = useCallback(
    (id: string, field: keyof Omit<CurrentMedication, "id">, value: string) => {
      onChange(medications.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
    },
    [medications, onChange],
  );

  if (medications.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-border bg-bg-soft px-6 py-8 text-center">
          <p className="text-sm text-ink-soft mb-3">Sin medicamentos registrados</p>
          <button
            type="button"
            onClick={addRow}
            className="hce-btn-secondary text-xs"
          >
            + Agregar medicamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabecera Desktop */}
      <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_32px] gap-2 px-2 pb-2 border-b border-border">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Medicamento</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Dosis</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Frecuencia</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Desde</div>
        <div></div>
      </div>

      {/* Lista de Medicamentos */}
      <div className="space-y-4 sm:space-y-2">
        {medications.map((med, index) => (
          <div 
            key={med.id} 
            className="rounded-xl border border-border bg-bg-soft/50 sm:bg-transparent p-3 sm:p-0 sm:border-none flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_32px] gap-3 sm:gap-2 sm:items-center group"
          >
            {/* Header móvil (solo visible en sm e inferiores) */}
            <div className="flex sm:hidden items-center justify-between border-b border-border pb-2">
              <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                Medicamento {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRow(med.id)}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
                aria-label="Eliminar medicamento"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>

            {/* Inputs */}
            <div className="flex flex-col sm:block">
              <label className="text-[10px] font-bold text-ink-soft uppercase sm:hidden mb-1">Nombre</label>
              <input
                className="hce-input text-sm py-2 sm:py-1 bg-card shadow-sm sm:shadow-none"
                placeholder="Metformina"
                value={med.name}
                onChange={(e) => updateField(med.id, "name", e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:block">
              <label className="text-[10px] font-bold text-ink-soft uppercase sm:hidden mb-1">Dosis</label>
              <input
                className="hce-input text-sm py-2 sm:py-1 bg-card shadow-sm sm:shadow-none"
                placeholder="500 mg"
                value={med.dose}
                onChange={(e) => updateField(med.id, "dose", e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:block">
              <label className="text-[10px] font-bold text-ink-soft uppercase sm:hidden mb-1">Frecuencia</label>
              <input
                className="hce-input text-sm py-2 sm:py-1 bg-card shadow-sm sm:shadow-none"
                placeholder="Cada 12 horas"
                value={med.frequency}
                onChange={(e) => updateField(med.id, "frequency", e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:block">
              <label className="text-[10px] font-bold text-ink-soft uppercase sm:hidden mb-1">Desde</label>
              <input
                className="hce-input text-sm py-2 sm:py-1 bg-card shadow-sm sm:shadow-none"
                placeholder="3 años / 2022"
                value={med.since}
                onChange={(e) => updateField(med.id, "since", e.target.value)}
              />
            </div>

            {/* Botón borrar Desktop */}
            <div className="hidden sm:flex justify-center">
              <button
                type="button"
                onClick={() => removeRow(med.id)}
                aria-label="Eliminar medicamento"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="hce-btn-secondary text-xs"
      >
        + Agregar medicamento
      </button>
    </div>
  );
});
