"use client";

/**
 * push-notification-toggle.tsx
 *
 * Toggle de notificaciones push para la página /ajustes.
 * Gestiona el ciclo completo: suscripción, test de confirmación y desuscripción.
 *
 * IMPORTANTE: next-pwa desactiva el SW en desarrollo (NODE_ENV=development).
 * Las notificaciones push solo funcionan en el build de producción (Vercel).
 */

import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/constants/app";

const SW_READY_TIMEOUT_MS = 5000;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Wrapper around navigator.serviceWorker.ready with a hard timeout.
 * Without this, if the SW is not installed (dev mode, first load, cleared cache)
 * the promise never resolves and the UI hangs in the loading state forever.
 */
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }
  return Promise.race<ServiceWorkerRegistration | null>([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS)),
  ]);
}

type PushState = "unsupported" | "loading" | "not-subscribed" | "subscribed";

export function PushNotificationToggle() {
  const { tenant } = useTenant();
  const [state, setState] = useState<PushState>("loading");
  const [reminderMins, setReminderMins] = useState<number>(() => {
    const prefs = tenant?.ui_preferences as Record<string, unknown>;
    return (prefs?.notification_time_minutes as number) || 30;
  });

  // Check SW support and current subscription status on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    getSwRegistration()
      .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
      .then((sub) => setState(sub ? "subscribed" : "not-subscribed"))
      .catch(() => setState("not-subscribed"));
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!tenant) return;
    setState("loading");

    try {
      // 1. Ask for notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("not-subscribed");
        toast.error("Permiso de notificaciones denegado. Habilítalo en la configuración del navegador.");
        return;
      }

      // 2. Get SW registration (with timeout — prevents infinite hang)
      const reg = await getSwRegistration();
      if (!reg) {
        setState("not-subscribed");
        toast.error(
          "El Service Worker no está disponible. Las notificaciones push requieren el build de producción. " +
          "Si estás en producción, recarga la página e intenta de nuevo.",
        );
        return;
      }

      // 3. Check VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("Falta la llave VAPID pública (NEXT_PUBLIC_VAPID_PUBLIC_KEY) en el entorno.");
      }

      // 4. Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 5. Save subscription to Supabase
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
        throw new Error((data as { error?: string }).error ?? "Error al guardar la suscripción.");
      }

      setState("subscribed");
      toast.success("¡Notificaciones activadas! Recibirás recordatorios de seguimiento.");

      // 6. Send a confirmation push (fire-and-forget — don't block on error)
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${APP_NAME} — Notificaciones activas ✓`,
          body: "Recibirás un aviso cuando un seguimiento venza hoy.",
          url: "/pacientes",
        }),
      }).catch(() => undefined);
    } catch (err) {
      setState("not-subscribed");
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error("No se pudo activar: " + message);
    }
  }, [tenant]);

  const handleUnsubscribe = useCallback(async () => {
    setState("loading");
    try {
      const reg = await getSwRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          // Remove from Supabase (fire-and-forget — local unsubscribe already done)
          fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
          }).catch(() => undefined);
        }
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

  const handleReminderChange = async (minutes: number) => {
    setReminderMins(minutes);
    if (!tenant?.doctor_id) return;
    
    const nextPrefs = {
      ...(tenant.ui_preferences as object),
      notification_time_minutes: minutes
    };
    
    // Lazy import supabase client since this is a client component
    const { getSupabaseClient } = await import("@/lib/supabase/client");
    await getSupabaseClient()
      .from("profiles")
      .update({ ui_preferences: nextPrefs })
      .eq("doctor_id", tenant.doctor_id);
      
    toast.success(`Recordatorios configurados para ${minutes} minutos antes de la cita.`);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-medium text-ink">Notificaciones en este dispositivo</h4>
          <p className="text-sm text-ink-soft">
            Recibe recordatorios de agenda y seguimientos directamente en tu pantalla o dispositivo.
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

      {isSubscribed && (
        <div className="flex items-center gap-4 border-t border-border pt-4">
          <label htmlFor="reminder-select" className="text-sm font-medium text-ink">
            Avisarme de mi próxima cita:
          </label>
          <select
            id="reminder-select"
            className="hce-input w-auto min-w-[150px] py-1.5 text-sm"
            value={reminderMins}
            onChange={(e) => handleReminderChange(Number(e.target.value))}
          >
            <option value={15}>15 minutos antes</option>
            <option value={30}>30 minutos antes</option>
            <option value={60}>1 hora antes</option>
            <option value={120}>2 horas antes</option>
          </select>
        </div>
      )}
    </div>
  );
}
