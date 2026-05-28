"use client";

import Link from "next/link";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import type { FollowUpPanelFilter, FollowUpPanelItem } from "@/features/dashboard/components/types";

const FILTER_LABELS: Record<FollowUpPanelFilter, string> = {
  vencidos: "Vencidos",
  urgentes: "Próximos",
  proximos: "Futuros",
};

type Props = {
  items: FollowUpPanelItem[];
  counts: Record<FollowUpPanelFilter, number>;
  activeFilter: FollowUpPanelFilter;
  onFilterChange: (filter: FollowUpPanelFilter) => void;
};

export function DashboardFollowUpPanel({ items, counts, activeFilter, onFilterChange }: Props) {
  const FILTERS: FollowUpPanelFilter[] = ["vencidos", "urgentes", "proximos"];
  
  return (
    <section>
      <div className="gx-sh"><h2 className="gx-st">Seguimientos</h2></div>
      
      <div className="gx-fu-tabs">
        {FILTERS.map(k=>(
          <button 
            key={k} 
            className={`gx-fu-tab${activeFilter===k?" gx-fu-tab-on":""}`} 
            onClick={()=>onFilterChange(k)}
          >
            {FILTER_LABELS[k]}
            <span className="gx-tc">{counts[k]}</span>
          </button>
        ))}
      </div>
      
      <div className="space-y-0 mt-2">
        {items.length === 0 ? (
          <div className="text-sm text-ink-soft italic px-2">No hay seguimientos en esta categoría.</div>
        ) : (
          items.map(f=>{
            let dateStr = "";
            try {
              dateStr = format(parseISO(f.dueDate), "d MMM", { locale: es });
            } catch (e) {
              dateStr = f.dueDate;
            }

            const pipClass = f.isOverdue ? "gx-pip-r" : f.isUrgent ? "gx-pip-w" : "gx-pip-g";
            const dateClass = f.isOverdue ? "gx-fu-date-r" : f.isUrgent ? "gx-fu-date-w" : "";

            return (
              <Link
                key={f.recordId}
                href={`/consultas?mode=seguimiento&patientId=${f.patientId}&recordId=${f.recordId}`}
                className="gx-fu-item"
              >
                <div className={`gx-fu-pip ${pipClass}`} />
                <div className="gx-fu-info">
                  <div className="gx-fu-name">{f.patientName}</div>
                  <div className="gx-fu-dx">{f.diagnosis || "Control general"}</div>
                </div>
                <span className={`gx-fu-date ${dateClass}`}>{dateStr}</span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  );
}
