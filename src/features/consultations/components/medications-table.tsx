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
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-soft">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-soft">Medicamento</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-soft">Dosis</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-soft">Frecuencia</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-soft">Desde</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {medications.map((med) => (
              <tr key={med.id} className="group hover:bg-bg-soft/50 transition-colors">
                <td className="px-2 py-1.5">
                  <input
                    className="hce-input text-sm py-1"
                    placeholder="Metformina"
                    value={med.name}
                    onChange={(e) => updateField(med.id, "name", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="hce-input text-sm py-1"
                    placeholder="500 mg"
                    value={med.dose}
                    onChange={(e) => updateField(med.id, "dose", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="hce-input text-sm py-1"
                    placeholder="Cada 12 horas"
                    value={med.frequency}
                    onChange={(e) => updateField(med.id, "frequency", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="hce-input text-sm py-1"
                    placeholder="3 años / 2022"
                    value={med.since}
                    onChange={(e) => updateField(med.id, "since", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
