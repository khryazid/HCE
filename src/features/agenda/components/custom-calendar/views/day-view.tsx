import { useEffect, useState } from 'react';
import { format, isSameDay, differenceInMinutes, startOfDay, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent } from '../types';

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  startHour?: number;
  endHour?: number;
}

export function DayView({ selectedDate, events, onEventClick, startHour = 6, endHour = 22 }: DayViewProps) {
  const [now, setNow] = useState(new Date());

  // Refrescar la línea de tiempo cada minuto
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dayEvents = events.filter((e) => isSameDay(new Date(e.start), selectedDate));
  
  // 1 hora = 120px (30 min = 60px, cumple regla de touch target)
  const PIXELS_PER_HOUR = 120;
  const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const dayStart = startOfDay(selectedDate);

  // Calcular posición de la línea actual
  const isToday = isSameDay(selectedDate, now);
  const minutesSinceStartOfDay = differenceInMinutes(now, addHours(dayStart, startHour));
  const indicatorTop = Math.max(0, minutesSinceStartOfDay * PIXELS_PER_MINUTE);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-w-[300px]">
          
          {/* Eje Y (Horas) */}
          <div className="w-16 shrink-0 border-r border-border bg-card z-10 relative">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="relative text-right pr-2 text-xs font-semibold text-ink-soft"
                style={{ height: `${PIXELS_PER_HOUR}px` }}
              >
                <span className="absolute -top-2.5 right-2 bg-card px-1">{`${hour.toString().padStart(2, '0')}:00`}</span>
              </div>
            ))}
          </div>

          {/* Grilla y Eventos */}
          <div className="flex-1 relative">
            {/* Líneas horizontales */}
            {hours.map((hour) => (
              <div key={hour} className="absolute w-full border-t border-border" style={{ top: `${(hour - startHour) * PIXELS_PER_HOUR}px` }} />
            ))}
            {/* Medias horas (dashed) */}
            {hours.map((hour) => (
              <div key={`half-${hour}`} className="absolute w-full border-t border-dashed border-border/50" style={{ top: `${(hour - startHour + 0.5) * PIXELS_PER_HOUR}px` }} />
            ))}

            {/* Eventos */}
            {dayEvents.map((e) => {
              const eStart = new Date(e.start);
              const eEnd = new Date(e.end);
              const top = differenceInMinutes(eStart, addHours(dayStart, startHour)) * PIXELS_PER_MINUTE;
              const height = differenceInMinutes(eEnd, eStart) * PIXELS_PER_MINUTE;

              return (
                <div
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className="absolute inset-x-2 rounded-xl border border-accent/20 bg-accent/10 p-2 shadow-sm transition-all hover:scale-[1.01] hover:bg-accent/20 hover:shadow-md cursor-pointer overflow-hidden flex flex-col"
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <span className="text-xs font-bold text-accent truncate">{format(eStart, 'HH:mm')} - {format(eEnd, 'HH:mm')}</span>
                  <span className="text-sm font-extrabold text-ink truncate mt-0.5">{e.patient_name || e.title}</span>
                </div>
              );
            })}

            {/* Indicador de hora actual */}
            {isToday && minutesSinceStartOfDay >= 0 && indicatorTop <= (endHour - startHour) * PIXELS_PER_HOUR && (
              <div 
                className="absolute w-full z-20 pointer-events-none flex items-center"
                style={{ top: `${indicatorTop}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 absolute -left-1" />
                <div className="w-full border-t-2 border-red-500" />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
