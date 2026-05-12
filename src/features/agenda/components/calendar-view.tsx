"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useAgenda } from "@/features/agenda/lib/use-agenda";
import { AppointmentModal } from "@/features/agenda/components/appointment-modal";
import { useTenant } from "@/lib/supabase/tenant-context";
import { toast } from "sonner";
import { Plus, Clock } from "lucide-react";
import { Database } from "@/types/supabase.types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
type CalendarEvent = AppointmentRow & { start: Date; end: Date; title: string };

const locales = {
  "es": es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/* ── Custom Toolbar ──────────────────────────────────────────────────────── */
import { ToolbarProps } from "react-big-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
function CustomToolbar(toolbar: ToolbarProps<CalendarEvent, object>) {
  const goToBack = () => toolbar.onNavigate("PREV");
  const goToNext = () => toolbar.onNavigate("NEXT");
  const goToCurrent = () => toolbar.onNavigate("TODAY");

  const label = () => {
    const date = format(toolbar.date, "MMMM yyyy", { locale: es });
    return date.charAt(0).toUpperCase() + date.slice(1);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={goToCurrent}
          className="hce-btn-secondary px-4 py-2"
        >
          Hoy
        </button>
        <div className="flex items-center rounded-xl border border-border bg-bg-soft p-1">
          <button
            onClick={goToBack}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-bg hover:text-ink transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-bg hover:text-ink transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <h2 className="text-xl font-bold text-ink ml-2 tracking-tight">
          {label()}
        </h2>
      </div>

      <div className="flex items-center rounded-xl border border-border bg-bg-soft p-1">
        {(["month", "week", "day", "agenda"] as View[]).map((viewName) => {
          const viewsMap: Record<string, string> = { month: "Mes", week: "Semana", day: "Día", agenda: "Lista" };
          return (
            <button
              key={viewName}
              onClick={() => toolbar.onView(viewName)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                toolbar.view === viewName
                  ? "bg-card text-ink shadow-sm ring-1 ring-border"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {viewsMap[viewName]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Custom Event Component ──────────────────────────────────────────────── */
function CustomEvent({ event }: { event: CalendarEvent }) {
  const isPaid = event.payment_status === "paid";
  const isHonorary = event.payment_status === "honorary";
  return (
    <div className="h-full w-full flex flex-col justify-start p-1.5">
      <div className="flex items-start justify-between gap-1">
        <span className="font-bold text-[13px] leading-tight truncate">{event.patient_name}</span>
        <span className="text-[10px] shrink-0">{isHonorary ? "🤝" : isPaid ? "✅" : "⏳"}</span>
      </div>
      <div className="flex items-center gap-1 mt-1 opacity-90">
        <Clock className="h-3 w-3" />
        <span className="text-[11px] font-medium">
          {format(new Date(event.start_time), "HH:mm")} - {format(new Date(event.end_time), "HH:mm")}
        </span>
      </div>
    </div>
  );
}

export function CalendarView() {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());

  const { tenant: tenantProfile, loading } = useTenant();
  const { appointments, config, isLoading, createAppointment, updateAppointment, deleteAppointment } = useAgenda();

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<AppointmentRow | undefined>();

  // Mapear los appointments de la BD a eventos de React Big Calendar
  const events = useMemo(() => {
    return appointments.map((app) => {
      let icon = "🟠";
      if (app.payment_status === "paid") icon = "✅";
      if (app.payment_status === "honorary") icon = "🤝";
      
      return {
        ...app,
        id: app.id,
        title: `${app.patient_name} - ${icon}`,
        start: new Date(app.start_time),
        end: new Date(app.end_time),
      };
    });
  }, [appointments]);

  const handleNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const handleViewChange = useCallback((newView: View) => setView(newView), []);

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      setSelectedEvent(undefined);
      setSelectedSlot({ start, end });
      setIsModalOpen(true);
    },
    []
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedSlot(undefined);
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleSaveAppointment = async (values: AppointmentInsert & { id?: string }) => {
    try {
      if (values.id) {
        await updateAppointment({ ...values, id: values.id });
        toast.success("Cita actualizada correctamente");
      } else {
        await createAppointment(values);
        toast.success("Cita agendada correctamente");
      }
    } catch (error) {
      toast.error("Hubo un error al guardar la cita");
      throw error;
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#0f766e"; // teal-700
    let borderColor = "#134e4a"; // teal-900

    if (event.status === "completed") {
      backgroundColor = "#475569"; // slate-600
      borderColor = "#334155";
    } else if (event.payment_status === "honorary") {
      backgroundColor = "#0284c7"; // sky-600
      borderColor = "#0369a1";
    } else if (event.payment_status === "pending") {
      backgroundColor = "#ea580c"; // orange-600
      borderColor = "#c2410c";
    } else if (event.status === "cancelled" || event.status === "no_show") {
      backgroundColor = "#dc2626"; // red-600
      borderColor = "#991b1b";
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "10px",
        opacity: 0.95,
        color: "white",
        border: `1px solid ${borderColor}`,
        display: "block",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        overflow: "hidden"
      },
    };
  };

  if (loading) return null;
  if (!tenantProfile) return null;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Agenda Médica</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Controla tus turnos y el estado de cobros de tus pacientes.
          </p>
        </div>
        <button 
          onClick={() => {
            setSelectedEvent(undefined);
            setSelectedSlot(undefined);
            setIsModalOpen(true);
          }}
          className="hce-btn-primary shrink-0 gap-2 shadow-md shadow-teal-500/20"
        >
          <Plus className="h-4 w-4" />
          Nueva Cita
        </button>
      </div>

      <div className="h-[550px] sm:h-[600px] lg:h-[calc(100vh-220px)] mt-6 relative z-0 flex flex-col">
        <style dangerouslySetInnerHTML={{__html: `
          /* Esconder toolbar nativo porque usamos uno custom */
          .rbc-toolbar { display: none !important; }

          /* Fondo y bordes generales */
          .rbc-calendar { background: transparent; font-family: inherit; }
          .rbc-time-view, .rbc-month-view, .rbc-agenda-view { 
            border: 1px solid var(--color-border) !important; 
            border-radius: 16px; 
            overflow: hidden; 
            background: var(--color-card) !important;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            flex: 1;
          }
          .rbc-time-content, .rbc-time-header { border-color: var(--color-border) !important; }
          .rbc-month-view { background: var(--color-card) !important; }
          
          /* Textos genéricos de RBC para forzar contraste */
          .rbc-calendar * {
            color: var(--color-ink);
          }

          /* Header (Días) */
          .rbc-header { 
            border-bottom: 1px solid var(--color-border) !important; 
            padding: 12px 0; 
            font-weight: 700; 
            color: var(--color-ink) !important; 
            text-transform: capitalize;
            font-size: 14px;
            background: var(--color-bg-soft) !important;
          }
          .rbc-header + .rbc-header { border-left: 1px solid var(--color-border) !important; }

          /* Líneas y grilla */
          .rbc-day-bg, .rbc-month-row, .rbc-time-slot { 
            border-color: var(--color-border) !important; 
            background: transparent !important;
          }
          .rbc-timeslot-group { border-bottom: 1px dashed var(--color-border) !important; }
          
          /* Barra de tiempo lateral */
          .rbc-time-gutter { 
            font-size: 12px; 
            font-weight: 600; 
            color: var(--color-ink-soft) !important; 
            background: var(--color-bg-soft) !important; 
          }
          .rbc-time-gutter .rbc-timeslot-group { border-color: transparent !important; }
          .rbc-label { padding: 0 8px; color: var(--color-ink-soft) !important; }

          /* Día Actual */
          .rbc-today { background-color: var(--color-surface-glow) !important; }
          .rbc-day-slot .rbc-time-slot { border-top: 1px solid var(--color-border) !important; }

          /* Fondos de celdas fuera del mes */
          .rbc-off-range-bg { background-color: var(--color-bg-soft) !important; }

          /* Eventos */
          .rbc-event { 
            padding: 0 !important; 
            transition: transform 0.15s ease, opacity 0.15s ease; 
          }
          .rbc-event * { color: #ffffff !important; } /* Forzar letras blancas DENTRO del evento siempre */
          .rbc-event:hover { transform: scale(1.02); opacity: 1 !important; z-index: 10; }
          
          /* Ocultar "all day" si no se usa */
          .rbc-allday-cell { display: none !important; }
          .rbc-time-view .rbc-allday-cell { display: none !important; }
        `}} />
        {isLoading ? (
          <div className="flex h-full items-center justify-center rounded-3xl border border-border bg-card">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
              <p className="text-ink-soft font-medium animate-pulse">Cargando agenda...</p>
            </div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            culture="es"
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%", fontFamily: "inherit" }}
            view={view}
            date={date}
            selectable={true}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: CustomToolbar,
              event: CustomEvent
            }}
            formats={{
              timeGutterFormat: (date, culture, localizer) => localizer!.format(date, "HH:mm", culture),
              eventTimeRangeFormat: () => "",
              dayFormat: (date, culture, localizer) => localizer!.format(date, "EEEE dd", culture),
            }}
            step={30}
            timeslots={2}
            min={new Date(0, 0, 0, 6, 0, 0)} // Empieza a las 6 AM
            max={new Date(0, 0, 0, 22, 0, 0)} // Termina a las 10 PM
            messages={{
              noEventsInRange: "No hay citas en este rango.",
            }}
          />
        )}
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAppointment}
        onDelete={deleteAppointment}
        initialData={selectedEvent}
        selectedSlot={selectedSlot}
        tenantInfo={{ clinic_id: tenantProfile.clinic_id, doctor_id: tenantProfile.doctor_id }}
        config={config}
      />
    </>
  );
}
