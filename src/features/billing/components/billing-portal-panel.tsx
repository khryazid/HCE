"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BillingPortalPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo abrir el portal de facturación.");
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
    <div className="rounded-2xl border border-border bg-bg-soft p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Facturación y Suscripción</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Administra tus métodos de pago, descarga facturas o cancela tu suscripción.
          </p>
        </div>
        <Button
          onClick={handleManageBilling}
          disabled={loading}
          variant="outline"
          className="shrink-0"
        >
          {loading ? "Redirigiendo..." : "Administrar en Stripe"}
        </Button>
      </div>
      {error && (
        <p className="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
