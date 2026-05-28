import React, { useMemo, useEffect, useState } from "react";
import { format, isSameDay, addDays, startOfWeek, setHours, setMinutes, startOfDay, differenceInMinutes, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { ViewMode, CalendarEvent } from "./types";

interface AgendaGridProps {
  currentDate: Date;
  viewMode: ViewMode;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onSlotClick: (d: Date) => void;
}

export function AgendaGrid({
  currentDate,
  viewMode,
  events,
  onEventClick,
  onSlotClick,
}: AgendaGridProps) {
  const startHour = 7;
  const endHour = 20;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  // Determinar los días a mostrar
  const days = useMemo(() => {
    if (viewMode === "day") {
      return [{
        date: currentDate,
        name: format(currentDate, "EEE", { locale: es }),
        num: format(currentDate, "d"),
        isToday: isToday(currentDate)
      }];
    }
    // Week view (Lunes a Viernes o Lunes a Domingo)
    // Mostraremos 5 días (Lun-Vie) o 7 (Lun-Dom)
    const weekStart = startOfWeek(currentDate, { locale: es, weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => { // 5 days for clinical density
      const d = addDays(weekStart, i);
      return {
        date: d,
        name: format(d, "EEE", { locale: es }),
        num: format(d, "d"),
        isToday: isToday(d)
      };
    });
  }, [currentDate, viewMode]);

  // NOW line
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const getEventClass = (type: string | undefined | null) => {
    switch (type) {
      case "primera_vez": return "gx-appt-1st";
      case "control": return "gx-appt-ctrl";
      case "seguimiento": return "gx-appt-fu";
      case "bloqueo": return "gx-appt-blocked";
      default: return "gx-appt-ctrl"; // fallback
    }
  };

  return (
    <div className="gx-grid gx-s gx-s3" style={{ "--cols": days.length } as React.CSSProperties}>
      <div className="gx-grid-hdr">
        <div className="gx-gh-empty" />
        {days.map((d, i) => (
          <div key={i} className={`gx-gh-day${d.isToday ? " gx-gh-today" : ""}`} onClick={() => onSlotClick(setHours(d.date, 9))}>
            <div className="gx-gh-name">{d.name}</div>
            <div className="gx-gh-num">{d.num}</div>
          </div>
        ))}
      </div>
      
      <div className="gx-grid-body">
        {/* Time axis */}
        <div className="gx-gb-times">
          {hours.map(h => (
            <div key={h} className="gx-gb-time">
              <span className="gx-gb-time-lbl">{h}:00</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d, colIdx) => (
          <div key={colIdx} className={`gx-gb-col${d.isToday ? " gx-gb-col-today" : ""}`}>
            
            {/* Clickable slots for every half hour */}
            {hours.map((h) => (
              <React.Fragment key={h}>
                <div 
                  className="gx-slot" 
                  onClick={() => onSlotClick(setMinutes(setHours(d.date, h), 0))}
                />
                <div 
                  className="gx-slot" 
                  onClick={() => onSlotClick(setMinutes(setHours(d.date, h), 30))}
                />
              </React.Fragment>
            ))}
            
            {/* NOW Line */}
            {d.isToday && now.getHours() >= startHour && now.getHours() <= endHour && (
              <div 
                className="gx-now-line" 
                style={{top: `${((now.getHours() + now.getMinutes() / 60) - startHour) * 60}px`}}
              >
                <div className="gx-now-dot" />
              </div>
            )}

            {/* Appointments */}
            {events.filter(ev => isSameDay(ev.start, d.date)).map(ev => {
              const startTotalMins = ev.start.getHours() * 60 + ev.start.getMinutes();
              const baseMins = startHour * 60;
              
              if (startTotalMins < baseMins) return null; // Outside visible hours

              const top = ((startTotalMins - baseMins) / 60) * 60;
              const durationMins = differenceInMinutes(ev.end, ev.start);
              const height = Math.max((durationMins / 60) * 60 - 2, 20); // min height 20px

              const cls = getEventClass(ev.consultation_type);
              
              return (
                <div 
                  key={ev.id} 
                  className={`gx-appt ${cls}`} 
                  style={{top: `${top}px`, height: `${height}px`, zIndex: 1}}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                >
                  <div className="gx-at-title" style={height < 30 ? {whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"} : {}}>
                    {ev.patient_name || ev.title}
                  </div>
                  {height >= 45 && (
                    <div className="gx-at-sub">
                      {format(ev.start, "HH:mm")} - {ev.consultation_type}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
