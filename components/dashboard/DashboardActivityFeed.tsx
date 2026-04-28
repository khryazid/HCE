"use client";

/**
 * components/dashboard/DashboardActivityFeed.tsx
 *
 * Feed de actividad reciente — últimos pacientes con última visita.
 */

import Link from "next/link";
import { formatDate } from "@/lib/ui/format-date";
import type { ActivityItem } from "@/components/dashboard/types";

const STATUS_STYLES: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-700",
  inactivo: "bg-bg-soft text-ink-soft",
  "en-seguimiento": "bg-sky-100 text-sky-700",
  alta: "bg-amber-100 text-amber-700",
};

type Props = {
  activity: ActivityItem[];
};

export function DashboardActivityFeed({ activity }: Props) {
  return (
    <article className="hce-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--ink)]">Pacientes Recientes</h2>
        <Link href="/pacientes" className="text-xs text-accent hover:underline">
          Ver todos
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {activity.length === 0 ? (
          <div className="hce-empty">Aun no hay actividad reciente.</div>
        ) : (
          activity.map((item) => (
            <Link
              key={item.id}
              href={`/pacientes?id=${item.id}`}
              className="block w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-left transition hover:bg-[color:var(--bg-soft)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.fullName}</p>
                  <p className="text-xs text-[color:var(--ink-soft)] mt-0.5">
                    {item.ageText}
                    {item.lastVisitReason
                      ? ` · Motivo: ${item.lastVisitReason.slice(0, 40)}${
                          item.lastVisitReason.length > 40 ? "…" : ""
                        }`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      STATUS_STYLES[item.status] ?? "bg-bg-soft text-ink-soft"
                    }`}
                  >
                    Estado: {item.status.replace("-", " ")}
                  </span>
                  <span className="text-[10px] text-[color:var(--ink-soft)]">
                    {formatDate(item.date)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </article>
  );
}
