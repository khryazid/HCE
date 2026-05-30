import React, { useState, useEffect } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Calendar } from "lucide-react";

export type DateFilterType = "today" | "week" | "month" | "custom";

export interface DateFilterValue {
  type: DateFilterType;
  start: Date;
  end: Date;
}

interface DateRangeFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
}

export function getDefaultDateFilter(type: DateFilterType = "today"): DateFilterValue {
  const now = new Date();
  switch (type) {
    case "week":
      return { type, start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { type, start: startOfMonth(now), end: endOfMonth(now) };
    case "today":
    default:
      return { type: "today", start: startOfDay(now), end: endOfDay(now) };
  }
}

export function DateRangeFilter({ value, onChange, className = "" }: DateRangeFilterProps) {
  const [customStart, setCustomStart] = useState<string>(format(value.start, "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState<string>(format(value.end, "yyyy-MM-dd"));

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as DateFilterType;
    if (newType === "custom") {
      onChange({ type: "custom", start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) });
    } else {
      onChange(getDefaultDateFilter(newType));
    }
  };

  useEffect(() => {
    if (value.type === "custom") {
      onChange({ type: "custom", start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customStart, customEnd]);

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 ${className}`}>
      <div className="relative group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        <label className="absolute left-3 top-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-soft transition-colors group-focus-within:text-accent">
          <Calendar className="h-3 w-3" /> Periodo
        </label>
        <select
          value={value.type}
          onChange={handleTypeChange}
          className="w-full sm:w-48 bg-transparent px-3 pb-2 pt-6 text-sm text-ink !outline-none !ring-0 !shadow-none !border-0 focus:!ring-0 focus:!shadow-none focus:!outline-none"
        >
          <option value="today">Hoy</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mes</option>
          <option value="custom">Rango Específico</option>
        </select>
      </div>

      {value.type === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none h-[42px]"
          />
          <span className="text-ink-soft text-sm">a</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none h-[42px]"
          />
        </div>
      )}
    </div>
  );
}
