import { useState, useMemo } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  subDays,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ViewMode } from './types';

export function useCalendarLogic(initialView: ViewMode = 'month') {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  // --- Navigation ---
  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const navigateToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // On mobile, clicking a date in month view often keeps you in month view 
    // but updates the selectedDate to show agenda below.
  };

  // --- Grid Calculations ---
  // Month Grid: 35 or 42 cells depending on the month start day
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    // startOfWeek and endOfWeek using Monday (1) or Sunday (0) based on locale/preference. 
    // Usually in Latam, week starts on Monday (1).
    const startDate = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { locale: es, weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => ({
      date,
      isCurrentMonth: isSameMonth(date, monthStart),
      isToday: isSameDay(date, new Date()),
      isSelected: isSameDay(date, selectedDate),
    }));
  }, [currentDate, selectedDate]);

  // Week Grid: 7 days
  const weekDays = useMemo(() => {
    const startDate = startOfWeek(currentDate, { locale: es, weekStartsOn: 1 });
    const endDate = endOfWeek(currentDate, { locale: es, weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => ({
      date,
      isToday: isSameDay(date, new Date()),
      isSelected: isSameDay(date, selectedDate),
    }));
  }, [currentDate, selectedDate]);

  return {
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
  };
}
