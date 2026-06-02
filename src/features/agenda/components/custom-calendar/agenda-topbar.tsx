import React from "react";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ViewMode } from "./types";

interface AgendaTopbarProps {
  currentDate: Date;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewAppointment: () => void;
  onToggleSidebar?: () => void;
}

export function AgendaTopbar({
  currentDate,
  viewMode,
  setViewMode,
  onPrev,
  onNext,
  onToday,
  onNewAppointment,
  onToggleSidebar,
}: AgendaTopbarProps) {
  const dateLabel = format(currentDate, "MMMM yyyy", { locale: es });

  return (
    <div className="gx-topbar gx-s gx-s1">
      <div className="gx-tb-left flex flex-col sm:flex-row sm:items-center">
        <h1 className="gx-tb-title">Calendario</h1>
        <div className="gx-tb-nav">
          <button className="gx-tb-btn gx-tb-btn-active" onClick={onToday}>
            Hoy
          </button>
          <button className="gx-tb-iconbtn" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="gx-tb-iconbtn" onClick={onNext}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="gx-tb-date">{dateLabel}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex gx-tb-nav bg-bg-soft p-1 rounded-md">
          {(["day", "week"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`gx-tb-btn ${viewMode === mode ? "gx-tb-btn-active" : ""}`}
            >
              {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        {onToggleSidebar && (
          <button className="gx-tb-btn lg:hidden min-h-[44px]" onClick={onToggleSidebar}>
            <Filter className="w-4 h-4 mr-2 hidden sm:inline" />
            Filtros
          </button>
        )}
        <button className="gx-btn gx-btn-p min-h-[44px]" onClick={onNewAppointment}>
          <Plus className="w-4 h-4" />
          Nueva cita
        </button>
      </div>
    </div>
  );
}
