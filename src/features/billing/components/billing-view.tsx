"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/app";

type ExpiryReason = "trial_expired" | "subscription_expired" | "inactive" | null;

const REASON_MESSAGES: Record<NonNullable<ExpiryReason>, { title: string; body: string }> = {
  trial_expired: {
    title: "Tu prueba gratuita de 7 días ha terminado",
    body: "Activa tu suscripción para seguir usando el motor clínico. Todos tus datos están intactos.",
  },
  subscription_expired: {
    title: "Tu suscripción ha expirado",
    body: "Renueva tu plan para recuperar el acceso completo. Tus pacientes y consultas siguen guardados.",
  },
  inactive: {
    title: "Tu cuenta no tiene una suscripción activa",
    body: "Selecciona un plan para comenzar a usar Glyphix.",
  },
};

/**
 * ExpiryBannerInner: componente interno que usa useSearchParams.
 * Debe estar dentro de <Suspense> para evitar el bail-out de prerender en Next.js.
 * Ver: https://nextjs.org/docs/app/api-reference/functions/use-search-params
 */
function ExpiryBannerInner() {
  const searchParams = useSearchParams();
  const [expiryReason, setExpiryReason] = useState<ExpiryReason>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("reason") as ExpiryReason | null;
    const fromStorage = (() => {
      try { return sessionStorage.getItem("billing_redirect_reason") as ExpiryReason | null; }
      catch { return null; }
    })();
    const reason = fromUrl ?? fromStorage;
    if (reason && reason in REASON_MESSAGES) {
      setTimeout(() => setExpiryReason(reason), 0);
      try { sessionStorage.removeItem("billing_redirect_reason"); } catch { /* ignore */ }
    }
  }, [searchParams]);

  if (!expiryReason || !REASON_MESSAGES[expiryReason]) return null;

  return (
    <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3" role="alert">
      <p className="text-sm font-semibold text-accent">{REASON_MESSAGES[expiryReason].title}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{REASON_MESSAGES[expiryReason].body}</p>
    </div>
  );
}

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? null;
const CLINIC_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CLINIC ?? null;

export default function BillingView({ proPrice = 29, clinicPrice = 99, isAdmin = true }: { proPrice?: number; clinicPrice?: number; isAdmin?: boolean }) {
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

      {/* Fix B-10: banner contextual según la razón del redirect.
           Envuelto en Suspense para que useSearchParams no cause bail-out de prerender. */}
      <Suspense fallback={null}>
        <ExpiryBannerInner />
      </Suspense>

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
            <li className="font-semibold text-ink">✓ 1 Asistente (Gestión de agenda y caja)</li>
            <li>✓ Pacientes y consultas ilimitados</li>
            <li>✓ Sugerencias de diagnóstico con IA</li>
            <li>✓ Evoluciones médicas y PDF clínico</li>
            <li>✓ Funcionamiento Offline sin internet</li>
          </ul>
          {!PRO_PRICE_ID && (
            <p className="mt-4 rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
              Plan no configurado. Contacta al administrador.
            </p>
          )}
          {isAdmin ? (
            <Button
              onClick={() => handleCheckout("pro")}
              disabled={loadingPlan !== null || !PRO_PRICE_ID}
              className="mt-6 w-full py-5 text-base hce-btn-primary"
            >
              {loadingPlan === "pro" ? "Procesando..." : "Comenzar ahora"}
            </Button>
          ) : (
            <div className="mt-6 rounded border border-accent/20 bg-accent/5 p-3 text-center text-sm text-accent">
              Solo el administrador de la clínica puede suscribirse
            </div>
          )}
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
            <li className="font-semibold text-ink">✓ Múltiples Médicos y Asistentes</li>
            <li>✓ Todo lo del plan Profesional</li>
            <li>✓ Reportes consolidados de clínica</li>
            <li>✓ Soporte prioritario 24/7</li>
          </ul>
          {!CLINIC_PRICE_ID && (
            <p className="mt-4 rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
              Plan no configurado. Contacta al administrador.
            </p>
          )}
          {isAdmin ? (
            <Button
              onClick={() => handleCheckout("clinic")}
              disabled={loadingPlan !== null || !CLINIC_PRICE_ID}
              className="mt-6 w-full py-5 text-base hce-btn-secondary"
            >
              {loadingPlan === "clinic" ? "Procesando..." : "Comenzar ahora"}
            </Button>
          ) : (
            <div className="mt-6 rounded border border-accent/20 bg-accent/5 p-3 text-center text-sm text-accent">
              Solo el administrador de la clínica puede suscribirse
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Al suscribirte aceptas nuestros Términos de Servicio y Políticas de Privacidad.
        Podrás cancelar en cualquier momento desde tu panel.
      </p>
    </div>
  );
}

