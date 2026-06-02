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
    <div className="flex flex-col gap-4 p-4 sm:p-6 bg-bg-elevated border-b border-border z-10">
      {/* Top Row: Title & Navigation */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl font-bold text-ink m-0">Calendario</h1>
          <span className="hidden sm:inline-block font-mono text-sm font-medium text-ink-soft capitalize">
            {dateLabel}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-bg-soft p-1 rounded-md">
            <button className="px-3 py-1.5 text-sm font-semibold rounded-md bg-card text-ink shadow-sm transition-all" onClick={onToday}>
              Hoy
            </button>
            <button className="p-1.5 text-ink-soft hover:text-ink hover:bg-card rounded-md transition-all" onClick={onPrev}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="p-1.5 text-ink-soft hover:text-ink hover:bg-card rounded-md transition-all" onClick={onNext}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {onToggleSidebar && (
            <button 
              className="lg:hidden flex items-center justify-center p-2 bg-bg-soft text-ink hover:bg-border/50 rounded-md transition-colors" 
              onClick={onToggleSidebar}
              title="Filtros"
            >
              <Filter className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile only date label */}
      <div className="sm:hidden font-mono text-sm font-medium text-ink-soft capitalize">
        {dateLabel}
      </div>
      
      {/* Bottom Row: View Modes & New Appointment */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex bg-bg-soft p-1 rounded-md overflow-x-auto hide-scrollbar">
          {(["day", "week", "month", "list"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                viewMode === mode ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {mode === "day" ? "Día" : mode === "week" ? "Semana" : mode === "month" ? "Mes" : "Lista"}
            </button>
          ))}
        </div>
        
        <button 
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover transition-colors shadow-sm" 
          onClick={onNewAppointment}
        >
          <Plus className="w-5 h-5" />
          Nueva cita
        </button>
      </div>
    </div>
  );
}
