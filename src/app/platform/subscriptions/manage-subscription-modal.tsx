"use client";

import { useState, useTransition } from "react";
import { setClinicSubscriptionStatus } from "@/features/platform/actions";
import { X, CalendarDays, ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ManageSubscriptionModalProps {
  clinicId: string;
  currentStatus: string;
  currentPlan: string;
  onClose: () => void;
}

export function ManageSubscriptionModal({ clinicId, currentStatus, currentPlan, onClose }: ManageSubscriptionModalProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus || "trial");
  const [plan, setPlan] = useState(currentPlan || "basic");
  
  // Custom days input if user wants something specific, though we'll use preset buttons mostly
  const [durationDays, setDurationDays] = useState<number>(30);

  const handleSave = (presetDays?: number, forceLifetime?: boolean) => {
    let finalStatus = status;
    if (forceLifetime) finalStatus = "lifetime";

    startTransition(async () => {
      try {
        await setClinicSubscriptionStatus(clinicId, finalStatus, forceLifetime ? undefined : (presetDays || durationDays), plan);
        router.refresh();
        onClose();
      } catch (error) {
        alert("Ocurrió un error al actualizar la suscripción");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-ink">Administrar Suscripción</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-soft hover:bg-bg-soft hover:text-ink transition-colors"
            disabled={isPending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status & Plan Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Estado</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isPending}
              >
                <option value="trial">Trial (Prueba)</option>
                <option value="active">Activo</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Plan Base</label>
              <select 
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isPending}
              >
                <option value="basic">Individual</option>
                <option value="clinic">Clínica</option>
              </select>
            </div>
          </div>

          <hr className="border-border" />

          {/* Quick Actions */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Sumar Tiempo (Otorga Días)</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleSave(30)}
                disabled={isPending || status === "canceled"}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-soft hover:bg-accent/10 text-ink hover:text-accent border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <CalendarDays className="w-4 h-4" /> 1 Mes
              </button>
              <button 
                onClick={() => handleSave(90)}
                disabled={isPending || status === "canceled"}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-soft hover:bg-accent/10 text-ink hover:text-accent border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <CalendarDays className="w-4 h-4" /> 3 Meses
              </button>
              <button 
                onClick={() => handleSave(180)}
                disabled={isPending || status === "canceled"}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-soft hover:bg-accent/10 text-ink hover:text-accent border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <CalendarDays className="w-4 h-4" /> 6 Meses
              </button>
              <button 
                onClick={() => handleSave(365)}
                disabled={isPending || status === "canceled"}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-soft hover:bg-accent/10 text-ink hover:text-accent border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <CalendarDays className="w-4 h-4" /> 1 Año
              </button>
            </div>
          </div>

          {/* Lifetime Action */}
          <div className="pt-2">
            <button 
              onClick={() => handleSave(0, true)}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              Otorgar Acceso Lifetime (Sin Vencimiento)
            </button>
          </div>
        </div>

        {/* Footer / Processing Overlay */}
        {isPending && (
          <div className="absolute inset-0 z-10 bg-card/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
            <p className="text-sm font-medium text-ink">Guardando cambios...</p>
          </div>
        )}
      </div>
    </div>
  );
}
