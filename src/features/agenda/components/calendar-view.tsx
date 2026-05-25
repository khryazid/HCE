"use client";

import { useState, useMemo } from "react";
import { useAgenda } from "@/features/agenda/lib/use-agenda";
import { useAgendaRealtime } from "@/features/agenda/lib/use-agenda-realtime";
import { AppointmentModal } from "@/features/agenda/components/appointment-modal";
import { useTenant } from "@/lib/supabase/tenant-context";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Database } from "@/types/supabase.types";
import { CalendarContainer } from "./custom-calendar/calendar-container";
import { CalendarEvent } from "./custom-calendar/types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

export function CalendarView() {
  const { tenant: tenantProfile, loading } = useTenant();
  const { appointments, config, isLoading, createAppointment, updateAppointment, deleteAppointment } = useAgenda();

  // ─── Realtime ─ auto-refresh cuando otra sesión crea/modifica/borra citas ──
  useAgendaRealtime(tenantProfile);

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<AppointmentRow | undefined>();

  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((app) => ({
      ...app,
      id: app.id,
      title: app.patient_name,
      start: new Date(app.start_time),
      end: new Date(app.end_time),
    }));
  }, [appointments]);

  const handleSelectSlot = (date: Date) => {
    setSelectedEvent(undefined);
    // Establecemos por defecto un bloque de 30 mins a partir de la hora de inicio o la hora actual
    const start = new Date(date);
    if (start.getHours() === 0 && start.getMinutes() === 0) {
      // Si el click vino del month view (día completo), ponemos las 09:00 por defecto
      start.setHours(9, 0, 0, 0);
    }
    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 30);

    setSelectedSlot({ start, end });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedSlot(undefined);
    setSelectedEvent(event as unknown as AppointmentRow);
    setIsModalOpen(true);
  };

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

      <div className="h-[600px] lg:h-[calc(100vh-140px)] mt-6 relative z-0 flex flex-col">
        {isLoading ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              <p className="text-ink-soft font-medium animate-pulse">Cargando agenda...</p>
            </div>
          </div>
        ) : (
          <CalendarContainer 
            events={events}
            onEventClick={handleSelectEvent}
            onSlotClick={handleSelectSlot}
            defaultView={typeof window !== 'undefined' && window.innerWidth < 640 ? 'day' : 'month'}
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
        allAppointments={appointments}
      />
    </>
  );
}
