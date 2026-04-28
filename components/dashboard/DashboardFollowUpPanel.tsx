"use client";

/**
 * components/dashboard/DashboardFollowUpPanel.tsx
 *
 * Panel de seguimientos pendientes con filtros urgentes/vencidos/próximos.
 */

import Link from "next/link";
import { formatDate } from "@/lib/ui/format-date";
import type { FollowUpPanelFilter, FollowUpPanelItem } from "@/components/dashboard/types";

const FILTER_LABELS: Record<FollowUpPanelFilter, string> = {
  urgentes: "Urgentes",
  vencidos: "Vencidos",
  proximos: "Próximos",
};

type Props = {
  items: FollowUpPanelItem[];
  counts: Record<FollowUpPanelFilter, number>;
  activeFilter: FollowUpPanelFilter;
  onFilterChange: (filter: FollowUpPanelFilter) => void;
};

export function DashboardFollowUpPanel({ items, counts, activeFilter, onFilterChange }: Props) {
  return (
    <article className="hce-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--ink)]">Seguimientos Pendientes</h2>
          <p className="text-xs text-[color:var(--ink-soft)]">Urgentes y vencidos</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["urgentes", "vencidos", "proximos"] as FollowUpPanelFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                activeFilter === filter
                  ? "bg-accent text-white"
                  : "bg-[color:var(--bg-soft)] text-ink-soft hover:text-ink"
              }`}
            >
              {FILTER_LABELS[filter]} ({counts[filter]})
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="hce-empty">
            No hay seguimientos {FILTER_LABELS[activeFilter].toLowerCase()} pendientes.
          </div>
        ) : (
          items.slice(0, 5).map((item) => (
            <div
              key={item.recordId}
              className={`rounded-xl border px-4 py-3 flex items-center justify-between transition hover:bg-[color:var(--bg-soft)] ${
                item.isOverdue
                  ? "border-red-200 bg-red-50/40"
                  : item.isUrgent
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-[color:var(--border)] bg-[color:var(--card)]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.patientName}</p>
                  {item.isOverdue && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800" aria-label="Estado: Vencido">
                      Vencido
                    </span>
                  )}
                  {!item.isOverdue && item.isUrgent && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800" aria-label="Estado: Urgente">
                      Urgente
                    </span>
                  )}
                </div>
                <p className="text-xs text-[color:var(--ink-soft)] mt-1">
                  Control pendiente: {formatDate(item.dueDate)}
                </p>
              </div>
              <Link
                href={`/consultas?mode=seguimiento&patientId=${item.patientId}&recordId=${item.recordId}`}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Abrir
              </Link>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
