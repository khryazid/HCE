"use client";
import { useEffect, useRef, useState } from 'react';
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

// Fixed column width — header and body MUST share this exact value
const COL_W = 96; // px

export function WeekView({ weekDays, events, onEventClick, startHour = 6, endHour = 22 }: WeekViewProps) {
  const [now, setNow] = useState(new Date());
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false); // prevent scroll loop

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (!bodyScrollRef.current) return;
    const currentMinutes = now.getHours() * 60 + now.getMinutes() - startHour * 60;
    if (currentMinutes > 0) {
      bodyScrollRef.current.scrollTop = Math.max(0, currentMinutes * PIXELS_PER_MINUTE - 120);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const PIXELS_PER_HOUR = 128;
  const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const isWalkIn = (e: CalendarEvent) => e.consultation_type === 'walk-in';

  // Sync header ↔ body horizontal scroll
  function onBodyScroll(e: React.UIEvent<HTMLDivElement>) {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    isSyncing.current = false;
  }

  function onHeaderScroll(e: React.UIEvent<HTMLDivElement>) {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    isSyncing.current = false;
  }

  const HOUR_COL_W = 48; // px — the hour-label gutter

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden select-none">

      {/* ── Fixed header row (days) ── */}
      <div className="flex shrink-0 border-b border-border bg-bg-soft/70">
        {/* Corner spacer — exact same width as hour gutter */}
        <div style={{ width: HOUR_COL_W }} className="shrink-0 border-r border-border" />
        {/* Day labels — scrollable but no scrollbar, driven by body */}
        <div
          ref={headerScrollRef}
          className="flex flex-1 overflow-x-hidden"
          onScroll={onHeaderScroll}
        >
          {weekDays.map(({ date, isToday }) => (
            <div
              key={date.toISOString()}
              style={{ minWidth: COL_W, width: COL_W }}
              className="shrink-0 border-r border-border py-2 text-center"
            >
              <div className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
                {format(date, 'EEE', { locale: es })}
              </div>
              <div
                className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? 'bg-accent text-white shadow-md' : 'text-ink'
                }`}
              >
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Walk-in strip ── */}
      {weekDays.some(({ date }) =>
        events.filter(isWalkIn).some((e) => isSameDay(new Date(e.start), date))
      ) && (
        <div className="flex shrink-0 border-b border-border bg-amber-50/60 dark:bg-amber-900/10">
          <div style={{ width: HOUR_COL_W }} className="shrink-0 border-r border-border flex items-center justify-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 rotate-180 [writing-mode:vertical-rl]">
              Llegada
            </span>
          </div>
          {/* Mirror header scroll for walk-in strip too */}
          <div className="flex flex-1 overflow-x-hidden" style={{ overflowX: 'hidden' }}>
            <div className="flex" style={{ transform: 'translateX(0)' }}>
              {weekDays.map(({ date }) => {
                const walkIns = events.filter(isWalkIn).filter((e) => isSameDay(new Date(e.start), date));
                return (
                  <div
                    key={date.toISOString()}
                    style={{ minWidth: COL_W, width: COL_W }}
                    className="shrink-0 border-r border-border p-1 space-y-0.5 min-h-[28px]"
                  >
                    {walkIns.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onEventClick(e)}
                        className={`w-full text-left px-2 py-0.5 rounded-md text-[10px] font-bold truncate ${
                          e.status === 'completed'
                            ? 'line-through bg-green-500/10 text-green-700'
                            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25'
                        }`}
                      >
                        {e.patient_name || e.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Time grid ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Hour labels gutter — scrolls vertically in sync, never horizontally */}
        <div
          style={{ width: HOUR_COL_W }}
          className="shrink-0 border-r border-border bg-card overflow-y-hidden pointer-events-none"
          aria-hidden
        >
          <div style={{ height: `${hours.length * PIXELS_PER_HOUR}px` }}>
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: PIXELS_PER_HOUR }}>
                <span className="absolute -top-2.5 right-1.5 text-[10px] font-semibold text-ink-soft bg-card px-0.5 leading-none">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body (horizontal + vertical) */}
        <div
          ref={bodyScrollRef}
          className="flex-1 overflow-auto"
          onScroll={(e) => {
            // Sync hour gutter vertical scroll
            const gutter = e.currentTarget.previousElementSibling as HTMLElement | null;
            if (gutter) gutter.scrollTop = e.currentTarget.scrollTop;
            // Sync header horizontal scroll
            onBodyScroll(e);
          }}
        >
          {/* Inner container: fixed height, flex row */}
          <div
            className="flex"
            style={{ height: `${hours.length * PIXELS_PER_HOUR}px`, minWidth: `${weekDays.length * COL_W}px` }}
          >
            {weekDays.map(({ date, isToday }) => {
              const timedEvents = events
                .filter((e) => !isWalkIn(e))
                .filter((e) => isSameDay(new Date(e.start), date));

              const dayStart = startOfDay(date);
              const minutesSinceStart = differenceInMinutes(now, addHours(dayStart, startHour));
              const indicatorTop = minutesSinceStart * PIXELS_PER_MINUTE;

              return (
                <div
                  key={date.toISOString()}
                  className="relative shrink-0 border-r border-border bg-card"
                  style={{ width: COL_W, height: `${hours.length * PIXELS_PER_HOUR}px` }}
                >
                  {/* Hour lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-border/50"
                      style={{ top: `${(hour - startHour) * PIXELS_PER_HOUR}px` }}
                    />
                  ))}
                  {/* Half-hour dashed */}
                  {hours.map((hour) => (
                    <div
                      key={`h-${hour}`}
                      className="absolute inset-x-0 border-t border-dashed border-border/25"
                      style={{ top: `${(hour - startHour + 0.5) * PIXELS_PER_HOUR}px` }}
                    />
                  ))}

                  {/* Events */}
                  {timedEvents.map((e) => {
                    const eStart = new Date(e.start);
                    const eEnd = new Date(e.end);
                    const top = differenceInMinutes(eStart, addHours(dayStart, startHour)) * PIXELS_PER_MINUTE;
                    const height = Math.max(22, differenceInMinutes(eEnd, eStart) * PIXELS_PER_MINUTE);

                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onEventClick(e)}
                        className="absolute inset-x-0.5 rounded-lg border border-accent/20 bg-accent/10 px-1.5 py-1 shadow-sm transition-all hover:bg-accent/20 hover:shadow-md cursor-pointer overflow-hidden flex flex-col z-10 text-left w-auto"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <span className="text-[9px] font-bold text-accent leading-none truncate">
                          {format(eStart, 'HH:mm')}
                        </span>
                        <span className="text-[10px] font-extrabold text-ink truncate leading-tight mt-0.5">
                          {e.patient_name || e.title}
                        </span>
                      </button>
                    );
                  })}

                  {/* Current time indicator */}
                  {isToday && minutesSinceStart >= 0 && indicatorTop <= hours.length * PIXELS_PER_HOUR && (
                    <div
                      className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${indicatorTop}px` }}
                    >
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 -ml-1 shadow-sm" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
