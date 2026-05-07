"use client";

/**
 * push-notification-toggle.tsx
 *
 * Toggle de notificaciones push para la página /ajustes.
 * Gestiona el ciclo completo: suscripción, test de confirmación y desuscripción.
 */

import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type PushState = "unsupported" | "loading" | "not-subscribed" | "subscribed";

export function PushNotificationToggle() {
  const { tenant } = useTenant();
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    // Race navigator.serviceWorker.ready against a 4s timeout.
    // Without the timeout, if the SW is not yet installed the promise
    // never resolves and the toggle is stuck in the loading spinner.
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));

    Promise.race([
      navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()),
      timeout,
    ])
      .then((sub) => setState(sub ? "subscribed" : "not-subscribed"))
      .catch(() => setState("not-subscribed"));
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!tenant) return;
    setState("loading");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("not-subscribed");
        toast.error("Permiso de notificaciones denegado. Habilítalo en la configuración del navegador.");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("Falta la llave VAPID pública en el entorno.");

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          clinic_id: tenant.clinic_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar la suscripción.");
      }

      setState("subscribed");
      toast.success("¡Notificaciones activadas! Recibirás recordatorios de seguimiento.");

      // Enviar notificación de confirmación
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Glyph — Notificaciones activas ✓",
          body: "Recibirás un aviso cuando un seguimiento venza hoy.",
          url: "/pacientes",
        }),
      });
    } catch (err) {
      setState("not-subscribed");
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error("No se pudo activar: " + message);
    }
  }, [tenant]);

  const handleUnsubscribe = useCallback(async () => {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setState("not-subscribed");
      toast.success("Notificaciones desactivadas en este dispositivo.");
    } catch {
      setState("subscribed");
      toast.error("No se pudo desactivar. Intenta de nuevo.");
    }
  }, []);

  if (state === "unsupported") {
    return (
      <p className="text-sm text-amber-600">
        Las notificaciones push no están soportadas en este navegador o modo incógnito.
      </p>
    );
  }

  const isLoading = state === "loading";
  const isSubscribed = state === "subscribed";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
      <div>
        <h4 className="font-medium text-ink">Notificaciones en este dispositivo</h4>
        <p className="text-sm text-ink-soft">
          Recibe recordatorios de seguimientos vencidos directamente en tu pantalla o dispositivo.
        </p>
      </div>

      <Button
        id="push-toggle-btn"
        variant={isSubscribed ? "secondary" : "default"}
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        disabled={isLoading}
        className="shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <>
            <Bell className="mr-2 h-4 w-4 text-emerald-600" />
            Activadas — Desactivar
          </>
        ) : (
          <>
            <BellOff className="mr-2 h-4 w-4" />
            Activar Notificaciones
          </>
        )}
      </Button>
    </div>
  );
}
