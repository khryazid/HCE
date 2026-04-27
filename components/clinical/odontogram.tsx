"use client";

import { useMemo, useState } from "react";
import type { OdontogramTooth, OdontogramToothState } from "@/types/clinical";

const TOOTH_GROUPS = [
  ["18", "17", "16", "15", "14", "13", "12", "11"],
  ["21", "22", "23", "24", "25", "26", "27", "28"],
  ["48", "47", "46", "45", "44", "43", "42", "41"],
  ["31", "32", "33", "34", "35", "36", "37", "38"],
];

const TOOTH_STATE_OPTIONS: Array<{
  value: OdontogramToothState;
  label: string;
  ring: string;
  fill: string;
}> = [
  { value: "sano", label: "Sano", ring: "ring-emerald-400", fill: "bg-emerald-50 text-emerald-700" },
  { value: "caries", label: "Caries", ring: "ring-amber-400", fill: "bg-amber-50 text-amber-700" },
  { value: "tratado", label: "Tratado", ring: "ring-cyan-400", fill: "bg-cyan-50 text-cyan-700" },
  { value: "ausente", label: "Ausente", ring: "ring-slate-400", fill: "bg-bg-soft text-ink-soft" },
];

const INITIAL_TOOTH_STATE: Record<string, OdontogramTooth> = Object.fromEntries(
  TOOTH_GROUPS.flat().map((numero) => [
    numero,
    {
      numero,
      estado: "sano" as OdontogramToothState,
    },
  ]),
);

type Props = {
  value?: OdontogramTooth[];
  onChange?: (teeth: OdontogramTooth[]) => void;
};

function cycleState(current: OdontogramToothState): OdontogramToothState {
  const index = TOOTH_STATE_OPTIONS.findIndex((option) => option.value === current);
  return TOOTH_STATE_OPTIONS[(index + 1) % TOOTH_STATE_OPTIONS.length].value;
}

function getToothTone(state: OdontogramToothState) {
  return TOOTH_STATE_OPTIONS.find((option) => option.value === state) ?? TOOTH_STATE_OPTIONS[0];
}

function summarizeTeeth(teeth: OdontogramTooth[]) {
  return teeth.reduce(
    (acc, tooth) => {
      acc[tooth.estado] += 1;
      return acc;
    },
    { sano: 0, caries: 0, ausente: 0, tratado: 0 } as Record<OdontogramToothState, number>,
  );
}

export function Odontogram({ value, onChange }: Props) {
  const [localTeeth, setLocalTeeth] = useState<OdontogramTooth[]>(() =>
    value && value.length > 0 ? value : Object.values(INITIAL_TOOTH_STATE),
  );
  const teeth = value ?? localTeeth;
  const summary = useMemo(() => summarizeTeeth(teeth), [teeth]);

  function updateTooth(numero: string) {
    const next = teeth.map((tooth) =>
      tooth.numero === numero
        ? { ...tooth, estado: cycleState(tooth.estado) }
        : tooth,
    );

    if (!value) {
      setLocalTeeth(next);
    }

    onChange?.(next);
  }

  return (
    <article className="hce-card space-y-5">
      <header className="space-y-2">
        <p className="hce-kicker text-teal-700">Odontologia</p>
        <h2 className="hce-section-title">Odontograma interactivo</h2>
        <p className="hce-page-lead">
          Toca cada pieza dental para alternar entre sano, caries, tratado y ausente.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {TOOTH_GROUPS.map((group, rowIndex) => (
            <div key={group.join("-")} className="grid grid-cols-8 gap-2">
              {group.map((numero) => {
                const tooth = teeth.find((item) => item.numero === numero) ?? INITIAL_TOOTH_STATE[numero];
                const tone = getToothTone(tooth.estado);

                return (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => updateTooth(numero)}
                    title={`Pieza ${numero}: ${tone.label}`}
                    className={`group flex min-h-16 flex-col items-center justify-center rounded-2xl border p-2 text-sm font-semibold transition focus-visible:ring-offset-[color:var(--bg)] ${tone.ring} ${tone.fill}`}
                  >
                    <span className="text-[11px] uppercase tracking-[0.15em] opacity-80">
                      {rowIndex < 2 ? "Sup" : "Inf"}
                    </span>
                    <span className="text-base leading-none">{numero}</span>
                    <span className="mt-1 text-[10px] font-medium opacity-80">{tone.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <aside className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-4">
          <div>
            <p className="text-sm font-semibold text-[color:var(--ink)]">Resumen</p>
            <p className="text-xs text-[color:var(--ink-soft)]">
              Conteo rápido del estado dental actual.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TOOTH_STATE_OPTIONS.map((option) => (
              <div key={option.value} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--ink-soft)]">{option.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{summary[option.value]}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Leyenda</p>
            <div className="flex flex-wrap gap-2">
              {TOOTH_STATE_OPTIONS.map((option) => (
                <span key={option.value} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)]">
                  <span className={`h-2.5 w-2.5 rounded-full ${option.ring.replace("ring-", "bg-")}`} />
                  {option.label}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
