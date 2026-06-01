"use client";

import { useState } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useReceptionistDoctors, useDoctorAppointments } from "@/features/reception/lib/use-reception";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card } from "@/components/ui/card";
import {
  ClipboardList,
  Calendar,
  UserCircle,
  AlertTriangle,
  Palmtree,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Receptionist dashboard — /recepcion
 *
 * Shows agendas for ALL doctors that have receptionist_enabled = true
 * in their doctor_settings. Must NOT expose clinical data.
 */
export function RecepcionPageClient() {
  const { tenant, loading, error, session } = useTenant();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  const { data: doctors, isLoading: doctorsLoading } = useReceptionistDoctors(
    tenant?.clinic_id ?? ""
  );

  const selectedDoctor = doctors?.find((d) => d.doctor_id === selectedDoctorId);

  const { data: appointments, isLoading: apptLoading } = useDoctorAppointments(
    tenant?.clinic_id ?? "",
    selectedDoctorId
  );

  if (loading) return <DashboardSkeleton />;

  if (error || !tenant || !session) {
    return (
      <div className="rounded-md bg-red-50 p-4 mt-4 text-sm font-medium text-red-800">
        No se pudo cargar el contexto.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"><Clock className="mr-1 h-3 w-3" /> Programada</span>;
      case "completed":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"><CheckCircle className="mr-1 h-3 w-3" /> Completada</span>;
      case "cancelled":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><XCircle className="mr-1 h-3 w-3" /> Cancelada</span>;
      case "no_show":
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><AlertTriangle className="mr-1 h-3 w-3" /> No asistió</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-accent" />
            Recepción
          </h2>
          <p className="text-sm text-ink-soft mt-1">
            Gestión de agendas y citas de los médicos de la clínica.
          </p>
        </div>
        {selectedDoctorId && (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Doctor selector */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wider">
            Médicos Habilitados
          </h3>

          {doctorsLoading ? (
            <Card className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto" />
            </Card>
          ) : !doctors || doctors.length === 0 ? (
            <Card className="p-4 border-dashed bg-bg-soft/30 text-center">
              <UserCircle className="h-8 w-8 text-ink-soft/50 mx-auto mb-2" />
              <p className="text-sm text-ink-soft">
                Ningún médico ha habilitado el acceso de recepcionista.
              </p>
              <p className="text-xs text-ink-soft/70 mt-1">
                Configurable en Ajustes → Recepcionista
              </p>
            </Card>
          ) : (
            doctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoctorId(doc.doctor_id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedDoctorId === doc.doctor_id
                    ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                    : "border-border hover:border-accent/30 hover:bg-bg-soft/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                    {doc.profiles?.full_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-ink truncate">
                      Dr. {doc.profiles?.full_name ?? "Sin nombre"}
                    </p>
                    <p className="text-xs text-ink-soft truncate">
                      {doc.profiles?.specialty?.join(", ") || "Sin especialidad"}
                    </p>
                  </div>
                </div>
                {/* Vacation mode badge */}
                {doc.settings?.vacation_mode && (
                  <div className="mt-2 flex items-center gap-1.5 text-amber-600">
                    <Palmtree className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">En vacaciones</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Main area: Agenda */}
        <div className="lg:col-span-3">
          {!selectedDoctorId ? (
            <Card className="p-12 text-center border-dashed bg-bg-soft/30 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-ink">
                Selecciona un médico
              </h3>
              <p className="text-sm text-ink-soft max-w-sm mt-2">
                Elige un médico del panel lateral para ver su agenda y gestionar
                sus citas del día.
              </p>
            </Card>
          ) : apptLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Doctor header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Agenda de Dr. {selectedDoctor?.profiles?.full_name}
                  </h3>
                  <p className="text-sm text-ink-soft">
                    {format(new Date(), "EEEE dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
                <span className="text-sm text-ink-soft">
                  {appointments?.length ?? 0} citas hoy
                </span>
              </div>

              {/* Vacation warning */}
              {selectedDoctor?.settings?.vacation_mode && (
                <Card className="p-3 border-amber-200 bg-amber-50/50">
                  <div className="flex items-start gap-2">
                    <Palmtree className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">
                        Este médico está en modo vacaciones
                      </p>
                      <p className="text-xs text-amber-600">
                        Las citas nuevas podrían redirigirse a otro médico.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Appointments list */}
              {!appointments || appointments.length === 0 ? (
                <Card className="p-8 text-center border-dashed bg-bg-soft/30">
                  <Calendar className="h-10 w-10 text-ink-soft/40 mx-auto mb-3" />
                  <p className="text-sm text-ink-soft">No hay citas programadas para hoy.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <Card key={appt.id} className="p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold text-accent">
                              {format(new Date(appt.start_time), "HH:mm")}
                            </p>
                            <p className="text-xs text-ink-soft">
                              {format(new Date(appt.end_time), "HH:mm")}
                            </p>
                          </div>
                          <div className="border-l border-border pl-4">
                            <p className="font-medium text-ink">{appt.patient_name}</p>
                            {appt.patient_document && (
                              <p className="text-xs text-ink-soft">CI: {appt.patient_document}</p>
                            )}
                            {appt.consultation_type && (
                              <p className="text-xs text-ink-soft mt-0.5">{appt.consultation_type}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(appt.status)}
                        </div>
                      </div>
                      {appt.notes && (
                        <p className="text-xs text-ink-soft mt-2 pl-[76px] border-l-2 border-accent/20 ml-[30px]">
                          {appt.notes}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info banner */}
      <Card className="p-4 bg-blue-50/50 border-blue-200/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Acceso limitado</p>
            <p className="text-xs text-blue-600">
              Como recepcionista, puedes gestionar citas y agendas pero no tienes
              acceso a historias clínicas, consultas ni datos médicos de los pacientes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
