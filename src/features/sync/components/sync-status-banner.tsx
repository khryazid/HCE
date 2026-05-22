"use client";

import { useEffect, useState } from "react";
import { getSyncQueueStats } from "@/lib/db/indexeddb";
import Link from "next/link";
import { APP_EVENT_SUBSCRIPTION_EXPIRED, SYNC_FINISHED_EVENT } from "@/lib/sync/sync-worker";
import {
  APP_EVENT_REALTIME_DISCONNECTED,
  APP_EVENT_REALTIME_RECONNECTED,
} from "@/lib/observability/app-events";

export function SyncStatusBanner() {
  const [hasErrors, setHasErrors] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  // C-06: Banner dedicado para suscripción expirada — persiste hasta navegar a /billing
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  // Sync-3.1: Estado de conectividad (red + Realtime)
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [isRealtimeError, setIsRealtimeError] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const stats = await getSyncQueueStats();
        if (active) {
          setHasErrors(stats.failed > 0 || stats.conflicted > 0);
          setHasPending(stats.pending > 0);
        }
      } catch {
        // ignore — IDB puede no estar disponible aún
      }
    };

    void load();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };

    const handleSyncFinished = () => void load();

    // C-06: Escuchar evento de suscripción expirada emitido por el sync worker
    const handleSubscriptionExpired = () => {
      if (active) setSubscriptionExpired(true);
    };

    // Sync-3.1: Red online/offline
    const handleOnline  = () => { setIsOffline(false); setIsRealtimeError(false); };
    const handleOffline = () => setIsOffline(true);

    // Sync-3.1: Realtime channel error/reconnect
    const handleRealtimeDown = () => { if (active) setIsRealtimeError(true); };
    const handleRealtimeUp   = () => { if (active) setIsRealtimeError(false); };

    window.addEventListener("visibilitychange", handleVisibility);
    // Sync-5.2: Use the exported constant — the literal "hce:sync_finished" had
    // an underscore vs the worker's hyphen, so the banner never refreshed.
    window.addEventListener(SYNC_FINISHED_EVENT, handleSyncFinished);
    window.addEventListener(APP_EVENT_SUBSCRIPTION_EXPIRED, handleSubscriptionExpired);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(APP_EVENT_REALTIME_DISCONNECTED, handleRealtimeDown);
    window.addEventListener(APP_EVENT_REALTIME_RECONNECTED,  handleRealtimeUp);

    return () => {
      active = false;
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(SYNC_FINISHED_EVENT, handleSyncFinished);
      window.removeEventListener(APP_EVENT_SUBSCRIPTION_EXPIRED, handleSubscriptionExpired);
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(APP_EVENT_REALTIME_DISCONNECTED, handleRealtimeDown);
      window.removeEventListener(APP_EVENT_REALTIME_RECONNECTED,  handleRealtimeUp);
    };
  }, []);

  // C-06: Prioridad máxima — suscripción expirada supera cualquier otro estado
  if (subscriptionExpired) {
    return (
      <Link
        href="/billing"
        className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs shadow-sm hover:bg-red-100 transition dark:border-red-700 dark:bg-red-950 dark:hover:bg-red-900"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="font-medium text-red-700 dark:text-red-300">
          Suscripción expirada — tus datos locales están seguros
        </span>
      </Link>
    );
  }

  // Sync-3.1: Sin conexión a internet
  if (isOffline) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs shadow-sm dark:border-amber-700 dark:bg-amber-950">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        <span className="text-amber-700 dark:text-amber-300">Sin conexión — modo offline</span>
      </span>
    );
  }

  // Sync-3.1: Realtime desconectado (online pero canal fallido)
  if (isRealtimeError) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs shadow-sm dark:border-orange-700 dark:bg-orange-950">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
        <span className="text-orange-700 dark:text-orange-300">Realtime desconectado — reconectando…</span>
      </span>
    );
  }

  if (!hasErrors && !hasPending) return null;

  return (
    <Link
      href="/ajustes"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs shadow-sm hover:bg-bg-soft transition"
    >
      <span className="relative flex h-2 w-2">
        {hasPending && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            hasErrors ? "bg-red-500" : "bg-accent"
          }`}
        />
      </span>
      <span className="text-ink-soft">
        {hasErrors ? "Sincronización con errores" : "Sincronizando..."}
      </span>
    </Link>
  );
}
