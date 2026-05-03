"use client";

/**
 * components/patients/PatientAnalyticsBar.tsx
 * Barra de métricas globales de pacientes. Presentacional puro.
 */

import { Users, Activity, CalendarClock, CheckCircle } from "lucide-react";

type Props = {
  total: number;
  activos: number;
  seguimiento: number;
  alta: number;
};

const CARDS = (p: Props) => [
  {
    id: "total",
    label: "Total pacientes",
    value: p.total,
    icon: Users,
    color: "text-accent",
    bg: "bg-accent/10",
    accent: undefined,
  },
  {
    id: "activos",
    label: "Activos",
    value: p.activos,
    icon: Activity,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    accent: "border-l-4 border-l-emerald-400",
  },
  {
    id: "seguimiento",
    label: "En seguimiento",
    value: p.seguimiento,
    icon: CalendarClock,
    color: "text-sky-600",
    bg: "bg-sky-500/10",
    accent: "border-l-4 border-l-sky-400",
  },
  {
    id: "alta",
    label: "De alta",
    value: p.alta,
    icon: CheckCircle,
    color: "text-ink-soft",
    bg: "bg-bg-soft",
    accent: "border-l-4 border-l-border",
  },
];

export function PatientAnalyticsBar(props: Props) {
  const cards = CARDS(props);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.id}
            className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md ${card.accent ?? ""}`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(15,118,110,0.06) 0%, transparent 70%)",
              }}
            />
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.bg}`}>
              <Icon className={`h-4 w-4 ${card.color}`} aria-hidden />
            </div>
            <p className="mt-4 text-4xl font-extrabold tracking-tight text-ink">
              {card.value}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-ink-soft">
              {card.label}
            </p>
          </article>
        );
      })}
    </div>
  );
}
