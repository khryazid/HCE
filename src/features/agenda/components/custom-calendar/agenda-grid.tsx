import React, { useMemo, useEffect, useState } from "react";
import { format, isSameDay, addDays, startOfWeek, setHours, setMinutes, differenceInMinutes, isToday, startOfMonth, endOfMonth, endOfWeek, isSameMonth } from "date-fns";
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
  const startHour = 0;
  const endHour = 23;
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
    // Week view (Lunes a Domingo)
    // Mostraremos los 7 días de la semana
    const weekStart = startOfWeek(currentDate, { locale: es, weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => { 
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

  if (viewMode === "list") {
    const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    // Filtrar citas desde el inicio del mes actual o la semana actual para evitar una lista infinita hacia el pasado
    const filteredForList = sortedEvents.filter(ev => isSameMonth(ev.start, currentDate));
    
    const grouped = filteredForList.reduce((acc, ev) => {
      const dateStr = format(ev.start, "yyyy-MM-dd");
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(ev);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);

    const groupEntries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));

    const getEventColorStyle = (type: string | undefined | null) => {
      switch(type) {
        case "primera_vez": return { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" };
        case "control": return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-500" };
        case "seguimiento": return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-500" };
        case "bloqueo": return { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-600 dark:text-slate-400" };
        default: return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-500" };
      }
    };

    return (
      <div className="flex-1 overflow-y-auto bg-bg p-4 sm:p-6 hide-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
          {groupEntries.length === 0 ? (
            <div className="text-center text-ink-faint mt-10">No hay citas en este periodo.</div>
          ) : (
            groupEntries.map(([dateStr, dayEvents]) => {
              const dateObj = new Date(dateStr + "T00:00:00");
              return (
                <div key={dateStr} className="space-y-3">
                  <div className="font-bold text-ink-soft sticky top-0 bg-bg/95 backdrop-blur-sm py-2 z-10 border-b border-border/50 capitalize">
                    {format(dateObj, "EEEE, d 'de' MMMM", { locale: es })}
                  </div>
                  <div className="grid gap-2 sm:gap-3">
                    {dayEvents.map(ev => {
                      const colors = getEventColorStyle(ev.consultation_type);
                      return (
                        <div 
                          key={ev.id}
                          onClick={() => onEventClick(ev)}
                          className={`p-3 sm:p-4 rounded-xl border cursor-pointer shadow-sm flex items-center justify-between transition-transform hover:scale-[1.01] active:scale-[0.99] ${colors.bg} ${colors.border}`}
                        >
                          <div className="flex flex-col flex-1 min-w-0 pr-4">
                            <span className={`font-bold text-[15px] sm:text-base truncate ${colors.text}`}>{ev.patient_name || ev.title}</span>
                            <span className={`text-[11px] sm:text-xs font-semibold opacity-80 uppercase tracking-wider ${colors.text}`}>{ev.consultation_type || "Cita"}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`font-mono text-[15px] sm:text-base font-bold opacity-90 ${colors.text}`}>{format(ev.start, "HH:mm")}</span>
                            <div className={`text-[10px] uppercase tracking-wider font-bold opacity-70 ${colors.text}`}>
                              {ev.status === "completed" ? "Completada" : differenceInMinutes(ev.end, ev.start) + " min"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (viewMode === "month") {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { locale: es, weekStartsOn: 1 });
    
    const rows = [];
    let day = startDate;
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        const dayIsToday = isToday(cloneDay);
        const dayEvents = events.filter(e => isSameDay(e.start, cloneDay));
        
        rows.push(
          <div 
            key={day.toString()} 
            onClick={() => onSlotClick(setHours(cloneDay, 9))}
            className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b border-border transition-colors cursor-pointer hover:bg-bg-soft flex flex-col ${
              !isCurrentMonth ? "bg-bg-soft/50 text-ink-faint" : dayIsToday ? "bg-accent/5 font-semibold" : "bg-card text-ink"
            }`}
          >
            <div className={`text-right text-[10px] sm:text-sm p-1 ${dayIsToday ? "text-accent font-bold" : ""}`}>
              {format(cloneDay, "d")}
            </div>
            <div className="flex flex-col gap-0.5 sm:gap-1 mt-1 overflow-y-auto max-h-[50px] sm:max-h-[90px] hide-scrollbar flex-1">
              {dayEvents.slice(0, 4).map(ev => {
                const cls = getEventClass(ev.consultation_type);
                return (
                  <div 
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className={`text-[8px] sm:text-[11px] truncate px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded-sm font-medium ${cls}`}
                    style={{ position: 'relative', left: 'auto', right: 'auto', height: 'auto', borderLeftWidth: '2px' }}
                  >
                    {format(ev.start, "HH:mm")} {ev.patient_name || ev.title}
                  </div>
                );
              })}
              {dayEvents.length > 4 && (
                <div className="text-[9px] text-ink-faint text-center font-medium mt-1">
                  +{dayEvents.length - 4} más
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
    }

    return (
      <div className="flex-1 flex flex-col bg-border border-t border-border overflow-y-auto hide-scrollbar">
        <div className="grid grid-cols-7 border-b border-border bg-bg-elevated sticky top-0 z-10">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(dayName => (
            <div key={dayName} className="py-2 text-center text-[10px] sm:text-xs font-bold text-ink-soft uppercase tracking-wider border-r border-border last:border-none">
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 bg-card">
          {rows}
        </div>
      </div>
    );
  }

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
                  <div className="flex flex-col overflow-hidden leading-tight h-full justify-start w-full pointer-events-none" style={{ gap: height < 40 ? '0' : '2px' }}>
                    {height < 40 ? (
                      <div className="truncate text-[10px] sm:text-xs font-semibold">
                        {format(ev.start, "HH:mm")} • {ev.patient_name || ev.title}
                      </div>
                    ) : (
                      <>
                        <div className="truncate text-[10px] font-bold opacity-90 flex items-center gap-1.5">
                          {format(ev.start, "HH:mm")}
                          {ev.status === "completed" && <span title="Completada">✓</span>}
                          {ev.payment_status === "paid" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="Pagado"></span>}
                          {ev.payment_status === "pending" && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" title="Pendiente"></span>}
                        </div>
                        <div className="truncate text-xs sm:text-[13px] font-bold tracking-tight">
                          {ev.patient_name || ev.title}
                        </div>
                        {height >= 55 && ev.consultation_type && (
                          <div className="truncate text-[10px] sm:text-[11px] opacity-80 font-medium">
                            {ev.consultation_type}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
