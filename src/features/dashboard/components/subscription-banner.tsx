"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { differenceInDays } from "date-fns";

export function SubscriptionBanner() {
  const { tenant } = useTenant();

  if (!tenant || !tenant.subscription_status) return null;
  
  // No mostrar banner si es lifetime
  if (tenant.subscription_status === "lifetime") return null;

  // Si está vencida, el DashboardOnboardingGuard se encargará de redirigir a /billing
  // Pero si el usuario somehow está aquí, no mostramos banner porque ya será expulsado.
  const expiresAt = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : null;
  
  if (!expiresAt) return null;
  
  const daysLeft = differenceInDays(expiresAt, new Date());
  
  // Solo mostrar banner si quedan 7 días o menos.
  if (daysLeft > 7 || daysLeft < 0) return null;

  const isTrial = tenant.subscription_status === "trialing";
  const title = isTrial ? "Tu prueba gratuita está por terminar" : "Tu suscripción está por expirar";

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm animate-in fade-in duration-500">
      <div className="flex items-start sm:items-center gap-3">
        <div className="mt-0.5 sm:mt-0 flex-shrink-0">
          {daysLeft <= 3 ? (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          ) : (
            <Clock className="h-5 w-5 text-amber-600" />
          )}
        </div>
        <div className="flex-1 text-sm text-amber-800">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 opacity-90">
            {daysLeft === 0
              ? "Expira el día de hoy. Renueva para evitar interrupciones."
              : `Te quedan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} de acceso clínico.`}
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex-shrink-0">
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50"
          >
            Actualizar Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
