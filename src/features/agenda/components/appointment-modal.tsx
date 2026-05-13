"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarDays, User, Phone, CreditCard, DollarSign, Check, Trash2, Users } from "lucide-react";
import { format, formatISO, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/navigation";

const appointmentSchema = z.object({
  patient_name: z.string().min(2, "El nombre es requerido"),
  patient_phone: z.string().optional(),
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
    consultationTypes: { name: string; price: number }[] 
  };
};

export function AppointmentModal({ isOpen, onClose, onSave, onDelete, initialData, selectedSlot, tenantInfo, config }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_name: "",
      patient_phone: "",
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

  // Efecto para autocompletar precio según el tipo de consulta
  useEffect(() => {
    if (watchConsultationType && !isHonorary && isConsultationTypeDirty) {
      const found = config.consultationTypes.find(t => t.name === watchConsultationType);
      if (found) {
        form.setValue("amount", String(found.price), { shouldDirty: true });
      }
    }
  }, [watchConsultationType, isHonorary, isConsultationTypeDirty, config.consultationTypes, form]);

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
        const startD = new Date(initialData.start_time);
        const endD = new Date(initialData.end_time);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wasWalkIn = (initialData as any).consultation_type === 'walk-in';
        setIsWalkIn(wasWalkIn);
        form.reset({
          patient_name: initialData.patient_name,
          patient_phone: initialData.patient_phone || "",
          start_date: format(startD, "yyyy-MM-dd"),
          start_time: format(startD, "HH:mm"),
          end_time: format(endD, "HH:mm"),
          status: initialData.status as AppointmentFormValues["status"],
          payment_status: (initialData.payment_status as AppointmentFormValues["payment_status"]) || "pending",
          payment_method: initialData.payment_method || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          consultation_type: wasWalkIn ? 'walk-in' : ((initialData as any).consultation_type || ""),
          amount: initialData.amount?.toString() || "",
          notes: initialData.notes || "",
        });
      } else if (selectedSlot) {
        // Modo Creación desde Calendario
        setIsWalkIn(false);
        form.reset({
          patient_name: "",
          patient_phone: "",
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
      }

      const payload = {
        clinic_id: tenantInfo.clinic_id,
        doctor_id: tenantInfo.doctor_id,
        patient_name: values.patient_name,
        patient_phone: values.patient_phone,
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || !onDelete) return;
    if (confirm("¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.")) {
      setIsSubmitting(true);
      try {
        await onDelete(initialData.id);
        onClose();
      } catch (error) {
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  function handleStartConsultation() {
    if (!initialData) return;
    const pName = encodeURIComponent(initialData.patient_name || form.getValues("patient_name") || "");
    const url = `/dashboard/consultas?appointmentId=${initialData.id}&patientName=${pName}`;
    router.push(url);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-card border-border" aria-describedby={undefined}>
        <div className="bg-bg-soft px-6 py-4 border-b border-border">
          <DialogTitle className="text-xl font-bold text-ink">
            <CalendarDays className="inline-block mr-2 h-5 w-5 text-teal-600" />
            {initialData ? "Editar Cita" : "Nueva Cita"}
          </DialogTitle>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Datos del Paciente */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Datos del Paciente</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink">Nombre Completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
                  <input
                    {...form.register("patient_name")}
                    className="hce-input pl-9"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                {form.formState.errors.patient_name && <p className="text-xs text-red-500">{form.formState.errors.patient_name.message}</p>}
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
              {initialData && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full sm:w-auto text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Cita
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-stretch gap-3 w-full sm:w-auto">
              {initialData && (
                <button
                  type="button"
                  onClick={handleStartConsultation}
                  className="hce-btn-secondary border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 gap-2 w-full sm:w-auto justify-center"
                  disabled={isSubmitting}
                >
                  <Check className="h-4 w-4" />
                  Iniciar Consulta
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
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
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
