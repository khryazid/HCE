"use client";

import Link from "next/link";
import { formatDate } from "@/lib/ui/format-date";
import type { ActivityItem } from "@/features/dashboard/components/types";
import { ArrowRight } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  activo:          { bg: "bg-emerald-100",  text: "text-emerald-700", label: "Activo" },
  inactivo:        { bg: "bg-bg-soft",      text: "text-ink-soft",    label: "Inactivo" },
  "en-seguimiento":{ bg: "bg-sky-100",      text: "text-sky-700",     label: "Seguimiento" },
  alta:            { bg: "bg-amber-100",    text: "text-amber-700",   label: "Alta" },
};

type Props = { activity: ActivityItem[] };

export function DashboardActivityFeed({ activity }: Props) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
      {/* Hover glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 80% 10%, rgba(15,118,110,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-ink">Pacientes recientes</h2>
        <Link
          href="/pacientes"
          className="flex items-center gap-1 text-xs font-semibold text-accent transition hover:opacity-80"
        >
          Ver todos
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {activity.length === 0 ? (
          <div className="hce-empty">Aún no hay actividad reciente.</div>
        ) : (
          activity.map((item) => {
            const statusStyle =
              STATUS_STYLES[item.status] ?? { bg: "bg-bg-soft", text: "text-ink-soft", label: item.status };

            return (
              <Link
                key={item.id}
                href={`/pacientes?id=${item.id}`}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-bg-soft/50 px-4 py-3 text-left transition hover:bg-bg-soft hover:border-border"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.fullName}</p>
                  <p className="truncate text-xs text-ink-soft mt-0.5">
                    {item.ageText}
                    {item.lastVisitReason
                      ? ` · ${item.lastVisitReason.slice(0, 38)}${item.lastVisitReason.length > 38 ? "…" : ""}`
                      : ""}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {statusStyle.label}
                  </span>
                  <span className="text-[10px] text-ink-soft">{formatDate(item.date)}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </article>
  );
}
