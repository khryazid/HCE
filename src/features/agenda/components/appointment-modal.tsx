"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarDays, User, Phone, CreditCard, DollarSign, Check, Trash2, Users, MessageCircle } from "lucide-react";
import { format, formatISO, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { toISODateString, isValidDateString } from "@/lib/utils/date-utils";

const appointmentSchema = z.object({
  patient_first_name: z.string().min(2, "El nombre es requerido"),
  patient_last_name: z.string().min(2, "El apellido es requerido"),
  patient_phone: z.string().optional(),
  patient_document: z.string().optional(),
  patient_birth_date: z.string()
    .optional()
    .refine(
      (val) => isValidDateString(val),
      "Fecha de nacimiento inválida (usa DD/MM/AAAA)"
    ),
  start_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  payment_status: z.enum(["pending", "paid", "partial", "honorary"]),
  payment_method: z.string().optional(),
  consultation_type: z.string().optional(),
  amount: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

import { Database } from "@/types/supabase.types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: AppointmentInsert & { id?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<unknown>;
  initialData?: AppointmentRow; // Para editar cita existente
  selectedSlot?: { start: Date; end: Date }; // Para nueva cita en un hueco del calendario
  tenantInfo: { clinic_id: string; doctor_id: string };
  config: { 
    methods: { name: string; details: string }[]; 
    consultationTypes: { name: string; price: number; duration?: number }[] 
  };
  allAppointments?: AppointmentRow[];
};

import { ConfirmModal } from "@/components/ui/confirm-modal";

export function AppointmentModal({ isOpen, onClose, onSave, onDelete, initialData, selectedSlot, tenantInfo, config, allAppointments = [] }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_first_name: "",
      patient_last_name: "",
      patient_phone: "",
      patient_document: "",
      patient_birth_date: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      end_time: "09:30",
      status: "scheduled",
      payment_status: "pending",
      payment_method: "",
      consultation_type: "",
      amount: "",
      notes: "",
    },
  });

  // Walk-in mode = cita por orden de llegada
  const [isWalkIn, setIsWalkIn] = useState(false);

  // Inicializar formulario cuando cambian los props
  const paymentStatus = form.watch("payment_status");
  const isHonorary = paymentStatus === "honorary";
  const watchConsultationType = form.watch("consultation_type");
  const isConsultationTypeDirty = form.formState.dirtyFields.consultation_type;

  // Efecto para autocompletar precio y duración según el tipo de consulta
  const watchStartTime = form.watch("start_time");
  
  useEffect(() => {
    if (watchConsultationType && isConsultationTypeDirty) {
      const found = config.consultationTypes.find(t => t.name === watchConsultationType);
      if (found) {
        if (!isHonorary) {
          form.setValue("amount", String(found.price), { shouldDirty: true });
        }
        if (found.duration && watchStartTime) {
          const [hours, minutes] = watchStartTime.split(':').map(Number);
          const endD = new Date();
          endD.setHours(hours, minutes + found.duration, 0, 0);
          form.setValue("end_time", format(endD, "HH:mm"), { shouldDirty: true });
        }
      }
    }
  }, [watchConsultationType, isHonorary, isConsultationTypeDirty, config.consultationTypes, form, watchStartTime]);

  // Efecto para limpiar o resetear pagos si es honoraria
  useEffect(() => {
    if (isHonorary) {
      form.setValue("amount", "0");
      form.setValue("payment_method", "");
    }
  }, [isHonorary, form]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Modo Edición
        setIsEditing(false);
        const startD = new Date(initialData.start_time);
        const endD = new Date(initialData.end_time);
        const wasWalkIn = initialData.consultation_type === 'walk-in';
        setIsWalkIn(wasWalkIn);
        const nameParts = (initialData.patient_name || "").split(' ');
        form.reset({
          patient_first_name: nameParts[0] || "",
          patient_last_name: nameParts.slice(1).join(' ') || "",
          patient_phone: initialData.patient_phone || "",
          patient_document: initialData.patient_document || "",
          patient_birth_date: initialData.patient_birth_date || "",
          start_date: format(startD, "yyyy-MM-dd"),
          start_time: format(startD, "HH:mm"),
          end_time: format(endD, "HH:mm"),
          status: initialData.status as AppointmentFormValues["status"],
          payment_status: (initialData.payment_status as AppointmentFormValues["payment_status"]) || "pending",
          payment_method: initialData.payment_method || "",
          consultation_type: wasWalkIn ? 'walk-in' : (initialData.consultation_type || ""),
          amount: initialData.amount?.toString() || "",
          notes: initialData.notes || "",
        });
      } else if (selectedSlot) {
        // Modo Creación desde Calendario
        setIsEditing(true);
        setIsWalkIn(false);
        form.reset({
          patient_first_name: "",
          patient_last_name: "",
          patient_phone: "",
          patient_document: "",
          patient_birth_date: "",
          start_date: format(selectedSlot.start, "yyyy-MM-dd"),
          start_time: format(selectedSlot.start, "HH:mm"),
          end_time: format(selectedSlot.end, "HH:mm"),
          status: "scheduled",
          payment_status: "pending",
          payment_method: "",
          consultation_type: "",
          amount: "",
          notes: "",
        });
      }
    }
  }, [isOpen, initialData, selectedSlot, form]);

  async function onSubmit(values: AppointmentFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const isWalkInMode = isWalkIn || values.consultation_type === 'walk-in';

      let startDateTime: Date;
      let endDateTime: Date;

      if (isWalkInMode) {
        // Walk-in: use start of day so it shows in the all-day strip
        const dateBase = new Date(`${values.start_date}T00:00:00`);
        startDateTime = startOfDay(dateBase);
        endDateTime = endOfDay(dateBase);
      } else {
        startDateTime = new Date(`${values.start_date}T${values.start_time}:00`);
        endDateTime = new Date(`${values.start_date}T${values.end_time}:00`);
        
        if (endDateTime <= startDateTime) {
          setSubmitError("La hora de fin debe ser posterior a la hora de inicio.");
          setIsSubmitting(false);
          return;
        }

        // Validación de choques de horario
        const newStart = startDateTime.getTime();
        const newEnd = endDateTime.getTime();
        
        const hasConflict = allAppointments.some(app => {
          // Ignorar la cita actual si estamos editando
          if (initialData && app.id === initialData.id) return false;
          // Ignorar citas canceladas
          if (app.status === 'cancelled') return false;
          // Ignorar walk-in (no tienen bloque estricto en la vista de tiempo)
          if (app.consultation_type === 'walk-in') return false;

          const existingStart = new Date(app.start_time).getTime();
          const existingEnd = new Date(app.end_time).getTime();

          // Hay solapamiento si: nuevaInicio < viejaFin Y nuevaFin > viejaInicio
          return newStart < existingEnd && newEnd > existingStart;
        });

        if (hasConflict) {
          setSubmitError("Conflicto de horario: La cita se cruza con otra agenda existente.");
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        clinic_id: tenantInfo.clinic_id,
        doctor_id: tenantInfo.doctor_id,
        patient_name: `${values.patient_first_name.trim()} ${values.patient_last_name.trim()}`,
        patient_phone: values.patient_phone,
        patient_document: values.patient_document || null,
        patient_birth_date: toISODateString(values.patient_birth_date),
        start_time: formatISO(startDateTime),
        end_time: formatISO(endDateTime),
        status: values.status,
        payment_status: values.payment_status,
        payment_method: isHonorary ? null : (values.payment_method || null),
        consultation_type: isWalkInMode ? 'walk-in' : (values.consultation_type || null),
        amount: isHonorary ? 0 : (values.amount ? parseFloat(values.amount) : null),
        notes: values.notes,
      };

      if (initialData) {
        await onSave({ ...payload, id: initialData.id });
      } else {
        await onSave(payload);
      }
      onClose();
    } catch (error: unknown) {
      // Supabase PostgrestError comes as a plain object with a 'message' field
      let msg = "Ocurrió un error al guardar la cita. Intenta de nuevo.";
      if (error && typeof error === "object") {
        const e = error as Record<string, unknown>;
        if (typeof e.message === "string" && e.message) msg = e.message;
        else if (typeof e.details === "string" && e.details) msg = e.details;
        else if (typeof e.hint === "string" && e.hint) msg = e.hint;
      } else if (typeof error === "string") {
        msg = error;
      }
      console.error("[appointment-modal] save error:", JSON.stringify(error));
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!initialData?.id || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleStartConsultation() {
    if (!initialData) return;
    const pName = encodeURIComponent(initialData.patient_name || `${form.getValues("patient_first_name")} ${form.getValues("patient_last_name")}`.trim());
    const pDoc = initialData.patient_document ? `&patientDoc=${encodeURIComponent(initialData.patient_document)}` : "";
    const pBirth = initialData.patient_birth_date ? `&patientBirth=${encodeURIComponent(initialData.patient_birth_date)}` : "";
    const url = `/consultas?appointmentId=${initialData.id}&patientName=${pName}${pDoc}${pBirth}`;
    router.push(url);
  }

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-card border-border" aria-describedby={undefined}>
        <div className="bg-bg-soft px-6 py-4 border-b border-border">
          <DialogTitle className="text-xl font-bold text-ink">
            <CalendarDays className="inline-block mr-2 h-5 w-5 text-teal-600" />
            {initialData ? (isEditing ? "Editar Cita" : "Detalles de la Cita") : "Nueva Cita"}
          </DialogTitle>
        </div>

        {initialData && !isEditing ? (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Detalles de la cita (View Mode) */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-lg">
                    {(initialData.patient_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-ink text-lg truncate">{initialData.patient_name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                      {initialData.patient_phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {initialData.patient_phone}</span>
                      )}
                      {initialData.patient_document && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {initialData.patient_document}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft mb-1">Fecha y Hora</p>
                    <p className="text-sm font-medium text-ink">
                      {format(new Date(initialData.start_time), "dd/MM/yyyy")}
                      {initialData.consultation_type === 'walk-in' ? ' (Llegada)' : ` a las ${format(new Date(initialData.start_time), "HH:mm")}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-soft mb-1">Estado</p>
                    <p className="text-sm font-medium text-ink">
                      {initialData.status === 'scheduled' ? '🟢 Programada' :
                       initialData.status === 'completed' ? '☑️ Completada' :
                       initialData.status === 'no_show' ? '🔴 No asistió' : '🚫 Cancelada'}
                    </p>
                  </div>
                  {initialData.consultation_type && initialData.consultation_type !== 'walk-in' && (
                     <div>
                       <p className="text-xs font-semibold text-ink-soft mb-1">Tipo de Consulta</p>
                       <p className="text-sm font-medium text-ink">{initialData.consultation_type}</p>
                     </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-ink-soft mb-1">Cobro</p>
                    <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                      {initialData.payment_status === 'paid' ? '✅ Pagado' :
                       initialData.payment_status === 'pending' ? '🟠 Pendiente' :
                       initialData.payment_status === 'partial' ? '⏳ Parcial / Abono' : '🤝 Honoraria'}
                      {initialData.amount ? ` ($${initialData.amount})` : ''}
                    </p>
                  </div>
                </div>
                
                {initialData.notes && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-ink-soft mb-1">Motivo / Notas</p>
                    <p className="text-sm text-ink">{initialData.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-4 border-t border-border/50">
              <div className="flex justify-center sm:justify-start order-last sm:order-first">
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full sm:w-auto text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!initialData?.patient_phone) return;
                    const text = `Hola ${initialData.patient_name}, te recordamos tu cita médica para el día ${format(new Date(initialData.start_time), "dd/MM/yyyy")} a las ${format(new Date(initialData.start_time), "HH:mm")}.`;
                    const phoneStr = initialData.patient_phone.replace(/\D/g, "");
                    window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  disabled={!initialData?.patient_phone}
                  className="w-full sm:w-auto text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="h-4 w-4" />
                  Recordatorio
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-end items-stretch gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="hce-btn-secondary w-full sm:w-auto justify-center"
                >
                  Modificar Cita
                </button>
                <button
                  type="button"
                  onClick={handleStartConsultation}
                  className="hce-btn-primary gap-2 w-full sm:w-auto justify-center"
                >
                  <Check className="h-4 w-4" />
                  Iniciar Consulta
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Datos del Paciente */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Datos del Paciente</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Nombres *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
                  <input
                    {...form.register("patient_first_name")}
                    className="hce-input pl-9"
                    placeholder="Ej. Juan"
                  />
                </div>
                {form.formState.errors.patient_first_name && <p className="text-xs text-red-500">{form.formState.errors.patient_first_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Apellidos *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
                  <input
                    {...form.register("patient_last_name")}
                    className="hce-input pl-9"
                    placeholder="Ej. Pérez"
                  />
                </div>
                {form.formState.errors.patient_last_name && <p className="text-xs text-red-500">{form.formState.errors.patient_last_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
                  <input
                    {...form.register("patient_phone")}
                    className="hce-input pl-9"
                    placeholder="Ej. +34 600..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Cédula / DNI</label>
                <div className="relative">
                  <input
                    {...form.register("patient_document")}
                    className="hce-input pl-3"
                    placeholder="Ej. 0912345678"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Fecha de Nacimiento</label>
                <div className="relative">
                  <Controller
                    control={form.control}
                    name="patient_birth_date"
                    render={({ field }) => (
                      <input
                        type="text"
                        placeholder="DD/MM/AAAA"
                        className="hce-input pl-3"
                        value={
                          (field.value || "").includes("-") && (field.value || "").length === 10
                            ? (field.value || "").split("-").reverse().join("/")
                            : field.value || ""
                        }
                        onChange={(event) => {
                          let val = event.target.value.replace(/\D/g, "");
                          if (val.length > 8) val = val.slice(0, 8);
                          
                          let formatted = val;
                          if (val.length > 4) {
                            formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                          } else if (val.length > 2) {
                            formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                          }
                          
                          if (val.length === 8) {
                            const iso = `${val.slice(4)}-${val.slice(2, 4)}-${val.slice(0, 2)}`;
                            field.onChange(iso);
                          } else {
                            field.onChange(formatted);
                          }
                        }}
                      />
                    )}
                  />
                  {form.formState.errors.patient_birth_date && (
                    <p className="text-xs text-red-500 mt-1">
                      {form.formState.errors.patient_birth_date.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Fecha, Hora y modo Walk-in */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Fecha y Hora</h3>
              {/* Walk-in toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isWalkIn;
                  setIsWalkIn(next);
                  if (next) {
                    form.setValue('consultation_type', 'walk-in');
                  } else {
                    form.setValue('consultation_type', '');
                  }
                }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  isWalkIn
                    ? 'border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'border-border bg-card text-ink-soft hover:bg-bg-soft'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Por orden de llegada
              </button>
            </div>

            {isWalkIn ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/10 p-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  🚶 Cita por orden de llegada
                </p>
                <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/70">
                  Esta cita aparecerá en la franja superior de la agenda del día seleccionado, sin hora fija. Solo necesitas indicar la fecha.
                </p>
                <div className="mt-3 space-y-1.5">
                  <label className="text-sm font-semibold text-ink">Fecha</label>
                  <input type="date" {...form.register("start_date")} className="hce-input" />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink">Fecha</label>
                  <input type="date" {...form.register("start_date")} className="hce-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink">Inicio</label>
                  <input type="time" {...form.register("start_time")} className="hce-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink">Fin</label>
                  <input type="time" {...form.register("end_time")} className="hce-input" />
                </div>
              </div>
            )}
          </div>

          <hr className="border-border/50" />

          {/* Estado de la cita y Notas */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Estado de la Cita</label>
                <select {...form.register("status")} className="hce-input">
                  <option value="scheduled">🟢 Programada</option>
                  <option value="completed">☑️ Completada</option>
                  <option value="no_show">🔴 No asistió</option>
                  <option value="cancelled">🚫 Cancelada</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Motivo / Notas</label>
                <input {...form.register("notes")} className="hce-input" placeholder="Consulta general, control..." />
              </div>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Control de Pagos */}
          <div className="space-y-4 bg-teal-50/50 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/50">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal-800 dark:text-teal-400 flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Control de Cobro
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Estado de Pago</label>
                <select {...form.register("payment_status")} className="hce-input">
                  <option value="pending">🟠 Pendiente</option>
                  <option value="paid">✅ Pagado</option>
                  <option value="partial">⏳ Parcial / Abono</option>
                  <option value="honorary">🤝 Cita Honoraria</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-teal-600" />
                  Medio de Pago
                </label>
                <select
                  {...form.register("payment_method")}
                  className="hce-input"
                  disabled={isHonorary}
                >
                  <option value="">No especificado</option>
                  {config.methods.map((method, i) => (
                    <option key={i} value={method.name}>{method.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">$</span>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("amount")}
                    className="hce-input pl-7"
                    placeholder={isHonorary ? "0.00" : "0.00"}
                    disabled={isHonorary}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">
                  Tipo de Consulta
                </label>
                <select {...form.register("consultation_type")} className="hce-input">
                  <option value="">Selecciona un tipo...</option>
                  {config.consultationTypes.map((ctype, i) => (
                    <option key={i} value={ctype.name}>{ctype.name} (${ctype.price})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        {/* Botones */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-4 border-t border-border/50">
            <div className="flex justify-center sm:justify-start order-last sm:order-first">
              {/* Espacio para boton eliminar en modo edición si se desea, pero ya está en la vista */}
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-stretch gap-3 w-full sm:w-auto">
              {/* El botón de Iniciar Consulta se pasa al modo vista */}
              <button
                type="button"
                onClick={() => {
                  if (initialData) setIsEditing(false);
                  else onClose();
                }}
                className="hce-btn-secondary w-full sm:w-auto justify-center"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="hce-btn-primary gap-2 w-full sm:w-auto justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Guardando..."
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Guardar Cita
                  </>
                )}
              </button>
            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                ⚠️ {submitError}
              </div>
            )}
            </div>
          </div>
        </form>
        )}
        
        <ConfirmModal
          open={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title="Eliminar Cita"
          description="¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          cancelLabel="Mantener Cita"
          variant="danger"
        />
      </DialogContent>
    </Dialog>
  );
}
