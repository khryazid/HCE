"use client";

import { useMemo, useState } from "react";
import type { GrowthPoint } from "@/types/clinical";

const DEFAULT_POINTS: GrowthPoint[] = [
  { edad_meses: 6, peso_kg: 7.2, talla_cm: 66, percentil: 50 },
  { edad_meses: 12, peso_kg: 9.4, talla_cm: 74, percentil: 55 },
  { edad_meses: 18, peso_kg: 11.1, talla_cm: 82, percentil: 60 },
  { edad_meses: 24, peso_kg: 12.7, talla_cm: 87, percentil: 58 },
  { edad_meses: 36, peso_kg: 15.4, talla_cm: 96, percentil: 62 },
  { edad_meses: 48, peso_kg: 18.2, talla_cm: 104, percentil: 66 },
];

type Props = {
  value?: GrowthPoint[];
  onChange?: (points: GrowthPoint[]) => void;
};

const CHART_WIDTH = 640;
const CHART_HEIGHT = 280;
const PADDING = 36;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
}

export function GrowthCurve({ value, onChange }: Props) {
  const [localPoints, setLocalPoints] = useState<GrowthPoint[]>(() =>
    value && value.length > 0 ? value : DEFAULT_POINTS,
  );
  const points = value ?? localPoints;

  const maxEdad = Math.max(...points.map((point) => point.edad_meses), 48);
  const maxPeso = Math.max(...points.map((point) => point.peso_kg), 20);
  const maxTalla = Math.max(...points.map((point) => point.talla_cm), 110);

  const chart = useMemo(() => {
    const linePoints = points.map((point) => {
      const x =
        PADDING +
        (clamp(point.edad_meses, 0, maxEdad) / maxEdad) * (CHART_WIDTH - PADDING * 2);
      const y =
        CHART_HEIGHT -
        PADDING - (clamp(point.peso_kg, 0, maxPeso) / maxPeso) * (CHART_HEIGHT - PADDING * 2);

      return { ...point, x, y };
    });

    const heightGuide = points.map((point) => {
      const x =
        PADDING +
        (clamp(point.edad_meses, 0, maxEdad) / maxEdad) * (CHART_WIDTH - PADDING * 2);
      const y =
        CHART_HEIGHT -
        PADDING - (clamp(point.talla_cm, 0, maxTalla) / maxTalla) * (CHART_HEIGHT - PADDING * 2);

      return { ...point, x, y };
    });

    return {
      linePath: buildPath(linePoints),
      heightPath: buildPath(heightGuide),
      linePoints,
      heightGuide,
    };
  }, [maxEdad, maxPeso, maxTalla, points]);

  const latest = points[points.length - 1];

  function updateLatest(partial: Partial<GrowthPoint>) {
    const next = points.map((point, index) =>
      index === points.length - 1 ? { ...point, ...partial } : point,
    );

    if (!value) {
      setLocalPoints(next);
    }

    onChange?.(next);
  }

  return (
    <article className="hce-card space-y-5">
      <header className="space-y-2">
        <p className="hce-kicker text-sky-700">Pediatria</p>
        <h2 className="hce-section-title">Curva de crecimiento</h2>
        <p className="hce-page-lead">
          Visualiza evolución de peso y talla con una curva simple lista para consulta pediátrica.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_280px]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-4">
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-auto w-full">
            <defs>
              <linearGradient id="growth-line" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>

            <line x1={PADDING} y1={CHART_HEIGHT - PADDING} x2={CHART_WIDTH - PADDING} y2={CHART_HEIGHT - PADDING} stroke="currentColor" strokeOpacity="0.15" />
            <line x1={PADDING} y1={PADDING} x2={PADDING} y2={CHART_HEIGHT - PADDING} stroke="currentColor" strokeOpacity="0.15" />

            <path d={chart.linePath} fill="none" stroke="url(#growth-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={chart.heightPath} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="6 6" />

            {chart.linePoints.map((point) => (
              <g key={`peso-${point.edad_meses}`}>
                <circle cx={point.x} cy={point.y} r="5" fill="var(--accent)" />
                <circle cx={point.x} cy={point.y} r="10" fill="transparent" />
              </g>
            ))}

            {chart.heightGuide.map((point) => (
              <g key={`talla-${point.edad_meses}`}>
                <rect x={point.x - 4} y={point.y - 4} width="8" height="8" rx="2" fill="#0f766e" fillOpacity="0.7" />
              </g>
            ))}
          </svg>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[color:var(--ink-soft)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />
              Peso
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-teal-700/70" />
              Talla
            </span>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-4">
          <div>
            <p className="text-sm font-semibold text-[color:var(--ink)]">Ultima medicion</p>
            <p className="text-xs text-[color:var(--ink-soft)]">Edita la referencia final para adaptar la curva al caso actual.</p>
          </div>

          {latest ? (
            <div className="space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
              <label className="block text-sm font-medium text-[color:var(--ink)]">
                Edad (meses)
                <input
                  className="hce-input mt-1"
                  type="number"
                  min={0}
                  step={1}
                  value={latest.edad_meses}
                  onChange={(event) => updateLatest({ edad_meses: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="block text-sm font-medium text-[color:var(--ink)]">
                Peso (kg)
                <input
                  className="hce-input mt-1"
                  type="number"
                  min={0}
                  step={0.1}
                  value={latest.peso_kg}
                  onChange={(event) => updateLatest({ peso_kg: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="block text-sm font-medium text-[color:var(--ink)]">
                Talla (cm)
                <input
                  className="hce-input mt-1"
                  type="number"
                  min={0}
                  step={0.1}
                  value={latest.talla_cm}
                  onChange={(event) => updateLatest({ talla_cm: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="block text-sm font-medium text-[color:var(--ink)]">
                Percentil
                <input
                  className="hce-input mt-1"
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  value={latest.percentil}
                  onChange={(event) => updateLatest({ percentil: Number(event.target.value) || 0 })}
                />
              </label>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--ink-soft)]">Peso actual</p>
              <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{latest?.peso_kg.toFixed(1) ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--ink-soft)]">Talla</p>
              <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{latest?.talla_cm.toFixed(1) ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--ink-soft)]">Edad</p>
              <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{latest?.edad_meses ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[color:var(--ink-soft)]">Percentil</p>
              <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{latest?.percentil ?? "-"}</p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
