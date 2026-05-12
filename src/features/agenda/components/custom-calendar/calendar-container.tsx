import { useCalendarLogic } from './use-calendar-logic';
import { ViewMode, CalendarEvent } from './types';
import { MonthView } from './views/month-view';
import { WeekView } from './views/week-view';
import { DayView } from './views/day-view';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarContainerProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date) => void;
  defaultView?: ViewMode;
}

export function CalendarContainer({ events, onEventClick, onSlotClick, defaultView = 'month' }: CalendarContainerProps) {
  const {
    currentDate,
    selectedDate,
    viewMode,
    setViewMode,
    navigatePrev,
    navigateNext,
    navigateToday,
    handleDateSelect,
    monthDays,
    weekDays,
  } = useCalendarLogic(defaultView);

  const label = () => {
    if (viewMode === 'day') {
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: es });
    }
    const dateStr = format(currentDate, "MMMM yyyy", { locale: es });
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  return (
    <div className="flex h-full flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative z-0">
      
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border p-4 sm:px-6 bg-bg-soft/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight capitalize">
            {label()}
          </h2>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Navegación */}
          <div className="flex items-center gap-2">
            <button
              onClick={navigateToday}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-bg-soft hover:text-ink transition-colors shadow-sm"
            >
              Hoy
            </button>
            <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-sm">
              <button
                onClick={navigatePrev}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-bg-soft hover:text-ink transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={navigateNext}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-bg-soft hover:text-ink transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Vistas */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-sm">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => {
              const labels: Record<ViewMode, string> = { month: 'Mes', week: 'Semana', day: 'Día' };
              // En móvil, forzamos esconder la vista 'week' de los botones ya que month y day son mejores
              // Aunque hemos hecho el week view responsivo (swipe), limitaremos a Mes y Día en el switch para simplicidad, 
              // o los dejamos todos porque ahora son completamente funcionales. Dejamos todos por ahora.
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 sm:px-4 py-1.5 text-[11px] sm:text-sm font-semibold rounded-lg transition-all ${
                    viewMode === mode
                      ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-accent/20'
                      : 'text-ink-soft hover:bg-bg-soft hover:text-ink'
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Views ── */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'month' && (
          <MonthView
            monthDays={monthDays}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              handleDateSelect(d);
              // Do NOT auto-open slot modal here — user sees the day preview first
            }}
            onEventClick={onEventClick}
            onNewAppointment={onSlotClick}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            weekDays={weekDays}
            events={events}
            onEventClick={onEventClick}
            startHour={6}
            endHour={22}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            selectedDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            startHour={6}
            endHour={22}
          />
        )}
      </div>
    </div>
  );
}
