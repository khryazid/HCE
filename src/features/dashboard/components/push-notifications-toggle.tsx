"use client";

/**
 * PushNotificationsToggle.tsx
 *
 * Botón de activación/desactivación de notificaciones push Web.
 * Gestiona el ciclo completo:
 *   1. Pedir permiso al navegador
 *   2. Suscribir el Service Worker con la clave VAPID pública
 *   3. Guardar la suscripción en Supabase (/api/push/subscribe)
 *   4. Desuscribir cuando el usuario lo solicita (elimina el endpoint de la DB)
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type PushState = "unsupported" | "loading" | "not-subscribed" | "subscribed" | "error";

export function PushNotificationsToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check current subscription state on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setState(sub ? "subscribed" : "not-subscribed");
      })
      .catch(() => setState("not-subscribed"));
  }, []);

  const handleSubscribe = useCallback(async () => {
    setState("loading");
    setErrorMsg(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("not-subscribed");
        setErrorMsg("Permiso denegado. Habilita las notificaciones en la configuración del navegador.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo guardar la suscripción.");
      }

      setState("subscribed");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Error al activar las notificaciones.");
    }
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    setState("loading");
    setErrorMsg(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Notify backend to delete the endpoint from push_subscriptions
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setState("not-subscribed");
    } catch {
      setState("error");
      setErrorMsg("No se pudo desactivar. Intenta de nuevo.");
    }
  }, []);

  if (state === "unsupported") {
    return (
      <p className="rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-ink-soft">
        Tu navegador no soporta notificaciones push. Prueba en Chrome, Edge o Firefox.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Recordatorios de seguimiento</p>
          <p className="text-xs text-ink-soft">
            Recibe una notificación cuando un seguimiento vence hoy. Funciona incluso con la app cerrada.
          </p>
        </div>

        {/* Toggle visual */}
        <button
          id="push-toggle"
          type="button"
          role="switch"
          aria-checked={state === "subscribed"}
          aria-label={state === "subscribed" ? "Desactivar notificaciones push" : "Activar notificaciones push"}
          disabled={state === "loading"}
          onClick={state === "subscribed" ? handleUnsubscribe : handleSubscribe}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 ${
            state === "subscribed"
              ? "bg-emerald-500"
              : state === "loading"
                ? "bg-border"
                : "bg-border"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              state === "subscribed" ? "translate-x-6" : "translate-x-1"
            } ${state === "loading" ? "animate-pulse" : ""}`}
          />
        </button>
      </div>

      {/* Estado y acciones secundarias */}
      {state === "not-subscribed" && (
        <Button
          id="push-enable-btn"
          variant="outline"
          size="sm"
          onClick={handleSubscribe}
          className="w-full"
        >
          Activar notificaciones push
        </Button>
      )}

      {errorMsg && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {state === "subscribed" && (
        <p className="text-xs text-emerald-600">
          ✓ Notificaciones activas en este dispositivo.
        </p>
      )}
    </div>
  );
}
