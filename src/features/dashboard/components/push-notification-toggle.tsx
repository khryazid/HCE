"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const { tenant } = useTenant();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true);
          }
          setLoading(false);
        });
      });
    } else {
      setLoading(false);
    }
  }, []);

  const subscribeToPush = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permiso de notificaciones denegado.");
        setLoading(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Falta la llave VAPID pública en el entorno.");
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Send to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
          clinic_id: tenant.clinic_id,
        }),
      });

      if (!response.ok) throw new Error("Error al guardar la suscripción en el servidor");

      setIsSubscribed(true);
      toast.success("¡Notificaciones activadas en este dispositivo!");

      // Optional: Send a test notification
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "¡Conectado!",
          body: "Recibirás recordatorios de pacientes aquí.",
        })
      });

    } catch (err: any) {
      console.error(err);
      toast.error("No se pudo activar las notificaciones: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return <p className="text-sm text-amber-600">Las notificaciones Push no están soportadas en este navegador o modo incógnito.</p>;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
      <div>
        <h4 className="font-medium text-ink">Notificaciones en este dispositivo</h4>
        <p className="text-sm text-ink-soft">Recibe alertas de turnos y próximos controles directamente en tu pantalla.</p>
      </div>
      <Button 
        variant={isSubscribed ? "secondary" : "default"} 
        onClick={subscribeToPush}
        disabled={loading || isSubscribed}
      >
        {isSubscribed ? (
          <>
            <Bell className="w-4 h-4 mr-2 text-emerald-600" />
            Activadas
          </>
        ) : (
          <>
            <BellOff className="w-4 h-4 mr-2" />
            Activar Notificaciones
          </>
        )}
      </Button>
    </div>
  );
}
