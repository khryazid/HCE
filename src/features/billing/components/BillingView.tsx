"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/app";

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? null;
const CLINIC_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CLINIC ?? null;

export default function BillingView({ proPrice = 29, clinicPrice = 99 }: { proPrice?: number; clinicPrice?: number }) {
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "clinic" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (plan: "pro" | "clinic") => {
    const priceId = plan === "pro" ? PRO_PRICE_ID : CLINIC_PRICE_ID;
    if (!priceId) return;
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar el checkout.");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-3xl hce-surface">
      <h1 className="hce-page-title">Activa tu suscripción</h1>
      <p className="mt-2 hce-page-lead">
        Para continuar utilizando {APP_NAME} y acceder a todas las funcionalidades del motor clínico,
        necesitas una suscripción activa.
      </p>

      {error && (
        <p className="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* ── Plan Profesional ── */}
        <div className="rounded-2xl border-2 border-accent bg-bg-soft p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-ink">Profesional Independiente</h2>
          <p className="mt-1 text-sm text-ink-soft">Para médicos con consultorio propio.</p>
          <p className="mt-4 flex items-baseline gap-x-2">
            <span className="text-4xl font-bold tracking-tight text-ink">${proPrice}</span>
            <span className="text-sm font-semibold text-ink-soft">/mes</span>
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-soft flex-1">
            <li>✓ Pacientes y consultas ilimitados</li>
            <li>✓ Sugerencias CIE-10 con IA</li>
            <li>✓ PDF clínico profesional</li>
            <li>✓ Sync offline automático</li>
            <li>✓ Soporte por email</li>
          </ul>
          {!PRO_PRICE_ID && (
            <p className="mt-4 rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
              Plan no configurado. Contacta al administrador.
            </p>
          )}
          <Button
            onClick={() => handleCheckout("pro")}
            disabled={loadingPlan !== null || !PRO_PRICE_ID}
            className="mt-6 w-full py-5 text-base hce-btn-primary"
          >
            {loadingPlan === "pro" ? "Procesando..." : "Comenzar ahora"}
          </Button>
        </div>

        {/* ── Plan Clínica ── */}
        <div className="rounded-2xl border border-border bg-bg-soft p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-ink">Clínica</h2>
          <p className="mt-1 text-sm text-ink-soft">Para centros con múltiples doctores.</p>
          <p className="mt-4 flex items-baseline gap-x-2">
            <span className="text-4xl font-bold tracking-tight text-ink">${clinicPrice}</span>
            <span className="text-sm font-semibold text-ink-soft">/mes</span>
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-soft flex-1">
            <li>✓ Todo lo del plan Profesional</li>
            <li>✓ Múltiples doctores</li>
            <li>✓ Reportes consolidados</li>
            <li>✓ Soporte prioritario</li>
          </ul>
          {!CLINIC_PRICE_ID && (
            <p className="mt-4 rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
              Plan no configurado. Contacta al administrador.
            </p>
          )}
          <Button
            onClick={() => handleCheckout("clinic")}
            disabled={loadingPlan !== null || !CLINIC_PRICE_ID}
            className="mt-6 w-full py-5 text-base hce-btn-secondary"
          >
            {loadingPlan === "clinic" ? "Procesando..." : "Comenzar ahora"}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Al suscribirte aceptas nuestros Términos de Servicio y Políticas de Privacidad.
        Podrás cancelar en cualquier momento desde tu panel.
      </p>
    </div>
  );
}

