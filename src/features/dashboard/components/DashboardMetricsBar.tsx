"use client";

import type { DashboardMetrics } from "@/features/dashboard/components/types";
import { Users, CalendarClock, LayoutList, AlertTriangle } from "lucide-react";

type Props = {
  metrics: DashboardMetrics;
};

const METRIC_CARDS = (m: DashboardMetrics) => {
  const syncIssues = m.conflictedSyncItems + m.failedSyncItems;
  return [
    {
      id: "active-patients",
      label: "Pacientes activos",
      value: m.activePatients,
      icon: Users,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      id: "follow-up",
      label: "Seguimientos pendientes",
      value: m.followUpPending,
      icon: CalendarClock,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
    },
    {
      id: "monthly",
      label: "Consultas este mes",
      value: m.consultationsThisMonth,
      icon: LayoutList,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    ...(syncIssues > 0
      ? [
          {
            id: "conflicts",
            label: "Conflictos de sync",
            value: syncIssues,
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-500/10",
          },
        ]
      : []),
  ];
};

export function DashboardMetricsBar({ metrics }: Props) {
  const cards = METRIC_CARDS(metrics);

  return (
    <div className={`grid gap-4 ${cards.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.id}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            {/* Hover glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(15,118,110,0.07) 0%, transparent 70%)",
              }}
            />
            <div className="flex items-start justify-between">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}
              >
                <Icon className={`h-4.5 w-4.5 ${card.color}`} aria-hidden />
              </div>
            </div>
            <p className="mt-4 text-4xl font-extrabold tracking-tight text-ink">
              {card.value}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-ink-soft">
              {card.label}
            </p>
          </article>
        );
      })}
    </div>
  );
}
