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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CalendarState {
  currentDate: Date;
  selectedDate: Date;
  viewMode: ViewMode;
}
