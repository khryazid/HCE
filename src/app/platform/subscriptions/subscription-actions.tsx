"use client";

import { useTransition } from "react";
import { setClinicSubscriptionStatus } from "@/features/platform/actions";
import { CalendarDays, ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionActionsProps {
  clinicId: string;
}

export function SubscriptionActions({ clinicId }: SubscriptionActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleExtendTrial = () => {
    if (!confirm("¿Deseas agregar 7 días de Trial a esta organización?")) return;
    
    startTransition(async () => {
      try {
        await setClinicSubscriptionStatus(clinicId, "trial", 7);
        router.refresh();
      } catch (error) {
        alert("Ocurrió un error al actualizar la suscripción");
      }
    });
  };

  const handleLifetime = () => {
    if (!confirm("¿Estás seguro de otorgar acceso Lifetime (de por vida) a esta organización?")) return;

    startTransition(async () => {
      try {
        await setClinicSubscriptionStatus(clinicId, "lifetime");
        router.refresh();
      } catch (error) {
        alert("Ocurrió un error al actualizar la suscripción");
      }
    });
  };

  return (
    <div className="hidden group-hover:flex items-center gap-3">
      {isPending ? (
        <span className="text-xs text-ink-soft flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Procesando...
        </span>
      ) : (
        <>
          <button 
            onClick={handleExtendTrial}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-dark font-medium"
          >
            <CalendarDays className="w-3 h-3" />
            +7 Días
          </button>
          <button 
            onClick={handleLifetime}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ShieldCheck className="w-3 h-3" />
            Lifetime
          </button>
        </>
      )}
    </div>
  );
}
