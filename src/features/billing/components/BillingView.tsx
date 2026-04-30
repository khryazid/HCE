"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
export default function BillingView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: "price_placeholder_123", // In production this would be env var
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "No se pudo iniciar el checkout.");
      }
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl hce-surface">
      <h1 className="hce-page-title">Activa tu suscripción</h1>
      <p className="mt-2 hce-page-lead">
        Para continuar utilizando Glyph y acceder a todas las funcionalidades del motor clínico,
        necesitas una suscripción activa.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-bg-soft p-6">
        <h2 className="text-xl font-semibold text-ink">Plan Profesional</h2>
        <p className="mt-2 text-sm text-ink-soft">Suscripción mensual recurrente</p>
        <p className="mt-4 flex items-baseline gap-x-2">
          <span className="text-4xl font-bold tracking-tight text-ink">$29</span>
          <span className="text-sm font-semibold text-ink-soft">/mes</span>
        </p>

        <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-soft">
          <li>✓ Historia Clínica Electrónica ilimitada</li>
          <li>✓ Asistente de Codificación CIE-10 (IA)</li>
          <li>✓ Generación de Documentos PDF y Envío</li>
          <li>✓ Sincronización Local / Offline-first</li>
        </ul>

        {error && (
          <p className="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <Button
          onClick={handleCheckout}
          disabled={loading}
          className="mt-8 w-full py-6 text-base hce-btn-primary"
        >
          {loading ? "Procesando..." : "Proceder al Pago"}
        </Button>
      </div>
      
      <p className="mt-6 text-center text-xs text-ink-soft">
        Al suscribirte aceptas nuestros Términos de Servicio y Políticas de Privacidad.
        Podrás cancelar en cualquier momento desde tu panel.
      </p>
    </div>
  );
}

