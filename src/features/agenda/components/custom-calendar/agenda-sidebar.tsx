import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface FilterState {
  firstTime: boolean;
  control: boolean;
  followUp: boolean;
  blocked: boolean;
}

interface AgendaSidebarProps {
  currentDate: Date;
  onDateSelect: (d: Date) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  doctorName?: string;
  stats?: {
    firstTime: number;
    control: number;
    followUp: number;
    blocked: number;
  };
}

export function AgendaSidebar({
  currentDate,
  onDateSelect,
  filters,
  setFilters,
  doctorName = "Doctor",
  stats = { firstTime: 0, control: 0, followUp: 0, blocked: 0 }
}: AgendaSidebarProps) {
  // Mini-calendar state (independent from main view until a day is clicked)
  const [miniDate, setMiniDate] = useState(currentDate);

  const miniMonthDays = useMemo(() => {
    const monthStart = startOfMonth(miniDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { locale: es, weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => ({
      date,
      isCurrentMonth: isSameMonth(date, monthStart),
      isToday: isSameDay(date, new Date()),
      isSelected: isSameDay(date, currentDate),
    }));
  }, [miniDate, currentDate]);

  const handlePrevMonth = () => setMiniDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setMiniDate(prev => addMonths(prev, 1));

  return (
    <div className="gx-sidebar gx-s gx-s2">
      <div className="gx-mini-cal">
        <div className="gx-mc-header">
          <span className="gx-mc-month">{format(miniDate, "MMMM yyyy", { locale: es })}</span>
          <div className="flex gap-1">
            <button className="gx-tb-iconbtn" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></button>
            <button className="gx-tb-iconbtn" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="gx-mc-grid">
          {["L", "M", "M", "J", "V", "S", "D"].map((n, i) => (
            <div key={i} className="gx-mc-day-name">{n}</div>
          ))}
          {miniMonthDays.map((d, i) => {
            const isFaint = !d.isCurrentMonth;
            const isToday = d.isToday;
            const isSelected = d.isSelected;
            
            let cls = "gx-mc-cell";
            if (isFaint) cls += " gx-mc-faint";
            if (isToday) cls += " gx-mc-today";
            if (isSelected && !isToday) cls += " gx-mc-active";

            return (
              <div 
                key={i} 
                className={cls}
                onClick={() => {
                  setMiniDate(d.date);
                  onDateSelect(d.date);
                }}
              >
                {format(d.date, "d")}
              </div>
            );
          })}
        </div>
      </div>

      <div className="gx-fs">
        <div className="gx-fs-title">Tipos de Consulta</div>
        
        <label className="gx-f-item">
          <div className="gx-f-lbl">
            <input 
              type="checkbox" 
              className="gx-f-box" 
              checked={filters.firstTime}
              onChange={(e) => setFilters(prev => ({...prev, firstTime: e.target.checked}))}
            />
            <span className="gx-f-color" style={{backgroundColor: "var(--accent)"}} />
            Primera vez
          </div>
          <span className="gx-f-count">{stats.firstTime}</span>
        </label>

        <label className="gx-f-item">
          <div className="gx-f-lbl">
            <input 
              type="checkbox" 
              className="gx-f-box" 
              checked={filters.control}
              onChange={(e) => setFilters(prev => ({...prev, control: e.target.checked}))}
            />
            <span className="gx-f-color" style={{backgroundColor: "var(--state-ok)"}} />
            Control
          </div>
          <span className="gx-f-count">{stats.control}</span>
        </label>

        <label className="gx-f-item">
          <div className="gx-f-lbl">
            <input 
              type="checkbox" 
              className="gx-f-box" 
              checked={filters.followUp}
              onChange={(e) => setFilters(prev => ({...prev, followUp: e.target.checked}))}
            />
            <span className="gx-f-color" style={{backgroundColor: "var(--state-warn)"}} />
            Seguimiento
          </div>
          <span className="gx-f-count">{stats.followUp}</span>
        </label>

        <label className="gx-f-item">
          <div className="gx-f-lbl">
            <input 
              type="checkbox" 
              className="gx-f-box" 
              checked={filters.blocked}
              onChange={(e) => setFilters(prev => ({...prev, blocked: e.target.checked}))}
            />
            <span className="gx-f-color" style={{backgroundColor: "var(--ink-faint)"}} />
            Bloqueo / Otro
          </div>
          <span className="gx-f-count">{stats.blocked}</span>
        </label>
      </div>

      <div className="gx-fs">
        <div className="gx-fs-title">Calendario de</div>
        <label className="gx-f-item">
          <div className="gx-f-lbl">
            <input type="checkbox" className="gx-f-box" defaultChecked />
            <span className="gx-f-color" style={{backgroundColor: "var(--ink)"}} />
            {doctorName}
          </div>
        </label>
      </div>
    </div>
  );
}
