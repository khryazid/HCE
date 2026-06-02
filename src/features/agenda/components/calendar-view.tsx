"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Filter } from "lucide-react";
import { useAgenda } from "@/features/agenda/lib/use-agenda";
import { useAgendaRealtime } from "@/features/agenda/lib/use-agenda-realtime";
import { AppointmentModal } from "@/features/agenda/components/appointment-modal";
import { useTenant } from "@/lib/supabase/tenant-context";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Database } from "@/types/supabase.types";
import { CalendarEvent } from "./custom-calendar/types";
import { AgendaTopbar } from "./custom-calendar/agenda-topbar";
import { AgendaSidebar } from "./custom-calendar/agenda-sidebar";
import { AgendaGrid } from "./custom-calendar/agenda-grid";
import "./agenda.css";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

export function CalendarView() {
  const { tenant: tenantProfile, loading } = useTenant();
  const { appointments, config, isLoading, createAppointment, updateAppointment, deleteAppointment } = useAgenda();

  // ─── Realtime ─ auto-refresh cuando otra sesión crea/modifica/borra citas ──
  useAgendaRealtime(tenantProfile);

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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


  // Filtros de estado (nuevo diseño)
  const [filters, setFilters] = useState({
    firstTime: true,
    control: true,
    followUp: true,
    blocked: true,
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode('day');
    }
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const t = e.consultation_type;
      if (t === "primera_vez" && !filters.firstTime) return false;
      if (t === "control" && !filters.control) return false;
      if (t === "seguimiento" && !filters.followUp) return false;
      if (t === "bloqueo" && !filters.blocked) return false;
      return true;
    });
  }, [events, filters]);

  // Contadores para el Sidebar
  const stats = useMemo(() => {
    let firstTime = 0, control = 0, followUp = 0, blocked = 0;
    events.forEach(e => {
      const t = e.consultation_type;
      if (t === "primera_vez") firstTime++;
      else if (t === "control") control++;
      else if (t === "seguimiento") followUp++;
      else if (t === "bloqueo") blocked++;
      else control++; // default
    });
    return { firstTime, control, followUp, blocked };
  }, [events]);

  const handlePrev = () => setCurrentDate(d => {
    const nd = new Date(d);
    if (viewMode === 'day') nd.setDate(nd.getDate() - 1);
    else if (viewMode === 'week') nd.setDate(nd.getDate() - 7);
    else nd.setMonth(nd.getMonth() - 1);
    return nd;
  });
  
  const handleNext = () => setCurrentDate(d => {
    const nd = new Date(d);
    if (viewMode === 'day') nd.setDate(nd.getDate() + 1);
    else if (viewMode === 'week') nd.setDate(nd.getDate() + 7);
    else nd.setMonth(nd.getMonth() + 1);
    return nd;
  });

  if (loading) return null;
  if (!tenantProfile) return null;

  return (
    <>
      <div className="gx-agenda -mx-4 sm:-mx-6 lg:-mx-8">
        <AgendaTopbar
          currentDate={currentDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={() => setCurrentDate(new Date())}
          onNewAppointment={() => {
            setSelectedEvent(undefined);
            setSelectedSlot(undefined);
            setIsModalOpen(true);
          }}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        <div className="gx-layout relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 bg-card p-6 rounded-2xl shadow-lg border border-border">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                <p className="text-ink-soft font-medium animate-pulse">Cargando agenda...</p>
              </div>
            </div>
          )}

          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <AgendaSidebar 
              currentDate={currentDate}
              onDateSelect={setCurrentDate}
              filters={filters}
              setFilters={setFilters}
              doctorName={tenantProfile.role === "assistant" ? "Agenda General" : tenantProfile.full_name || "Doctor"}
              stats={stats}
              events={filteredEvents}
              onEventClick={handleSelectEvent}
            />
          </div>

          {/* Mobile Bottom Sheet Sidebar */}
          {isSidebarOpen && (
            <div className="fixed inset-0 z-[100] lg:hidden flex flex-col justify-end">
              <div 
                className="absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity" 
                onClick={() => setIsSidebarOpen(false)}
              />
              <div className="relative bg-bg w-full h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-bold text-lg text-ink">Filtros y Calendario</h3>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 bg-bg-soft rounded-full text-ink-soft hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <AgendaSidebar 
                    currentDate={currentDate}
                    onDateSelect={(d) => {
                      setCurrentDate(d);
                      setIsSidebarOpen(false);
                    }}
                    filters={filters}
                    setFilters={setFilters}
                    doctorName={tenantProfile.role === "assistant" ? "Agenda General" : tenantProfile.full_name || "Doctor"}
                    stats={stats}
                    events={filteredEvents}
                    onEventClick={(e) => {
                      handleSelectEvent(e);
                      setIsSidebarOpen(false);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          <AgendaGrid 
            currentDate={currentDate}
            viewMode={viewMode}
            events={filteredEvents}
            onEventClick={handleSelectEvent}
            onSlotClick={handleSelectSlot}
          />
        </div>
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
