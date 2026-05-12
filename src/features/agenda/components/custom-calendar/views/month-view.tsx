import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent } from '../types';

interface MonthViewProps {
  monthDays: {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[];
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function MonthView({ monthDays, events, selectedDate, onSelectDate, onEventClick }: MonthViewProps) {
  const weekDaysHeader = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Obtener eventos del día seleccionado para la "Agenda" en móvil
  const selectedDateEvents = events.filter((e) => isSameDay(new Date(e.start), selectedDate));

  return (
    <div className="flex h-full flex-col">
      {/* --- GRID --- */}
      <div className="flex-1 overflow-y-auto">
        {/* Cabecera Días */}
        <div className="grid grid-cols-7 border-b border-border bg-bg-soft">
          {weekDaysHeader.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-ink-soft uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid flex-1 grid-cols-7 auto-rows-fr bg-border gap-px">
          {monthDays.map(({ date, isCurrentMonth, isToday, isSelected }, i) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start), date));
            
            return (
              <div
                key={i}
                onClick={() => onSelectDate(date)}
                className={`min-h-[80px] sm:min-h-[120px] bg-card p-1 sm:p-2 transition-colors hover:bg-bg-soft cursor-pointer relative flex flex-col ${
                  !isCurrentMonth ? 'opacity-40 bg-bg' : ''
                } ${isSelected ? 'ring-2 ring-inset ring-accent/50 bg-accent/5' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm font-medium ${
                      isToday ? 'bg-accent text-white shadow-md' : 'text-ink'
                    }`}
                  >
                    {format(date, 'd')}
                  </span>
                  
                  {/* Puntos en Móvil (Dots) */}
                  <div className="flex sm:hidden gap-0.5">
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <div key={idx} className="h-1.5 w-1.5 rounded-full bg-accent" />
                    ))}
                    {dayEvents.length > 3 && <div className="h-1.5 w-1.5 rounded-full bg-ink-soft" />}
                  </div>
                </div>

                {/* Eventos en Desktop */}
                <div className="hidden sm:flex flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEventClick(e);
                      }}
                      className="truncate rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20 border border-accent/20"
                    >
                      {format(new Date(e.start), 'HH:mm')} {e.patient_name || e.title}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-[10px] text-ink-soft font-medium pl-1">
                      + {dayEvents.length - 4} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- AGENDA MÓVIL --- */}
      {/* Se muestra en móvil debajo del grid del mes con las citas del selectedDate */}
      <div className="sm:hidden flex flex-col border-t border-border bg-card shadow-[0_-10px_30px_rgba(0,0,0,0.03)] h-64 overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur z-10 px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold capitalize text-ink">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </h3>
        </div>
        <div className="flex flex-col p-4 gap-2">
          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-ink-soft italic text-center mt-6">Sin citas agendadas este día.</p>
          ) : (
            selectedDateEvents.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(e => (
              <div 
                key={e.id} 
                onClick={() => onEventClick(e)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-soft active:scale-[0.98] transition-transform"
              >
                <div className="flex flex-col items-center justify-center w-12 shrink-0 border-r border-border pr-3">
                  <span className="text-xs font-bold text-ink">{format(new Date(e.start), 'HH:mm')}</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-bold text-ink truncate">{e.patient_name || e.title}</span>
                  <span className="text-xs text-ink-soft truncate">{e.payment_status === 'honorary' ? 'Cortesía' : e.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
