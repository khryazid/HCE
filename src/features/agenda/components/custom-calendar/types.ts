export type ViewMode = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patient_name?: string;
  payment_status?: string;
  status?: string;
  /** "walk-in" = cita por orden de llegada, sin hora fija */
  consultation_type?: string | null;
  /** Campos extra del servidor (color, notas, etc.) — acceder con narrowing de tipo */
  [key: string]: unknown;
}

export interface CalendarState {
  currentDate: Date;
  selectedDate: Date;
  viewMode: ViewMode;
}
