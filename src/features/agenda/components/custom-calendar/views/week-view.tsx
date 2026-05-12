import { useEffect, useState } from 'react';
import { format, isSameDay, differenceInMinutes, startOfDay, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent } from '../types';

interface WeekViewProps {
  weekDays: { date: Date; isToday: boolean; isSelected: boolean }[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  startHour?: number;
  endHour?: number;
}

export function WeekView({ weekDays, events, onEventClick, startHour = 6, endHour = 22 }: WeekViewProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const PIXELS_PER_HOUR = 120;
  const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      
      {/* Cabecera de Días (Sincronizada con el scroll del cuerpo) */}
      <div className="flex border-b border-border bg-bg-soft">
        <div className="w-16 shrink-0 border-r border-border" /> {/* Spacer para la columna de horas */}
        <div className="flex flex-1 overflow-hidden" id="week-header-scroll">
          {weekDays.map(({ date, isToday }) => (
            <div 
              key={date.toISOString()} 
              className="w-full md:w-1/3 lg:w-[14.285%] shrink-0 border-r border-border py-3 text-center transition-colors"
            >
              <div className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                {format(date, 'EEEE', { locale: es })}
              </div>
              <div className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-accent text-white shadow-md' : 'text-ink'}`}>
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cuerpo del Grid */}
      <div className="flex-1 overflow-y-auto relative flex">
        
        {/* Eje Y (Horas) */}
        <div className="w-16 shrink-0 border-r border-border bg-card z-10 sticky left-0">
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

        {/* Columnas de los Días (Scroll Horizontal en móvil/tablet) */}
        <div 
          className="flex flex-1 overflow-x-auto snap-x snap-mandatory"
          onScroll={(e) => {
            const header = document.getElementById('week-header-scroll');
            if (header) header.scrollLeft = e.currentTarget.scrollLeft;
          }}
        >
          {weekDays.map(({ date, isToday }) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start), date));
            const dayStart = startOfDay(date);
            const minutesSinceStartOfDay = differenceInMinutes(now, addHours(dayStart, startHour));
            const indicatorTop = Math.max(0, minutesSinceStartOfDay * PIXELS_PER_MINUTE);

            return (
              <div 
                key={date.toISOString()} 
                className="w-full md:w-1/3 lg:w-[14.285%] shrink-0 snap-start border-r border-border relative bg-card"
              >
                {/* Líneas horizontales de fondo */}
                {hours.map((hour) => (
                  <div key={hour} className="absolute w-full border-t border-border" style={{ top: `${(hour - startHour) * PIXELS_PER_HOUR}px` }} />
                ))}
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
                      className="absolute inset-x-1 sm:inset-x-2 rounded-lg border border-accent/20 bg-accent/10 p-1.5 shadow-sm transition-all hover:scale-[1.02] hover:bg-accent/20 hover:shadow-md cursor-pointer overflow-hidden flex flex-col z-10"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <span className="text-[10px] sm:text-xs font-bold text-accent truncate">{format(eStart, 'HH:mm')}</span>
                      <span className="text-xs sm:text-sm font-extrabold text-ink truncate leading-tight">{e.patient_name || e.title}</span>
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
            );
          })}
        </div>

      </div>
    </div>
  );
}
