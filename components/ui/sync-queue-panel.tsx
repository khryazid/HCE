"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteSyncQueueItem,
  getSyncQueueStats,
  listSyncQueueItems,
} from "@/lib/db/indexeddb";
import {
  flushSyncQueue,
  SYNC_FINISHED_EVENT,
  type SyncFlushSummary,
} from "@/lib/sync/sync-worker";
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";
import type { SyncQueueItem } from "@/types/sync";

type QueueStats = {
  pending: number;
  failed: number;
  abandoned: number;
  conflicted: number;
};

type LastSyncState = {
  at: number;
  summary: SyncFlushSummary;
};

const LAST_SYNC_KEY = "hce:last-sync";

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString();
}

export function SyncQueuePanel() {
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    failed: 0,
    abandoned: 0,
    conflicted: 0,
  });
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<LastSyncState | null>(null);

  const hasItems = useMemo(
    () => stats.pending + stats.failed + stats.abandoned + stats.conflicted > 0,
    [stats],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [nextStats, nextItems] = await Promise.all([
          getSyncQueueStats(),
          listSyncQueueItems(),
        ]);

        if (!active) {
          return;
        }

        setStats(nextStats);
        setItems(nextItems);
      } catch (syncError) {
        if (active) {
          setError(
            syncError instanceof Error
              ? syncError.message
              : buildRetryableErrorMessage("cargar la cola de sincronizacion"),
          );
        }
      }
    };

    void load();
    const timer = setInterval(() => void load(), 4000);

    if (typeof window !== "undefined") {
      setIsOnline(window.navigator.onLine);

      const saved = window.localStorage.getItem(LAST_SYNC_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as LastSyncState;
          if (
            typeof parsed?.at === "number" &&
            typeof parsed?.summary?.processed === "number"
          ) {
            setLastSync(parsed);
          }
        } catch {
          // Ignore parse errors and continue with empty last sync state.
        }
      }

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      const handleSyncFinished = (event: Event) => {
        const customEvent = event as CustomEvent<SyncFlushSummary>;
        if (!customEvent.detail) {
          return;
        }

        const nextState: LastSyncState = {
          at: Date.now(),
          summary: customEvent.detail,
        };

        setLastSync(nextState);
        window.localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(nextState));
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener(SYNC_FINISHED_EVENT, handleSyncFinished as EventListener);

      return () => {
        active = false;
        clearInterval(timer);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener(SYNC_FINISHED_EVENT, handleSyncFinished as EventListener);
      };
    }

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  async function handleRetryNow() {
    setWorking(true);
    setError(null);

    try {
      await flushSyncQueue({ forceRetry: true });
      const [nextStats, nextItems] = await Promise.all([
        getSyncQueueStats(),
        listSyncQueueItems(),
      ]);
      setStats(nextStats);
      setItems(nextItems);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : buildRetryableErrorMessage("reintentar la sincronizacion"),
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleDiscard(itemId: string) {
    setWorking(true);
    setError(null);

    try {
      await deleteSyncQueueItem(itemId);
      const [nextStats, nextItems] = await Promise.all([
        getSyncQueueStats(),
        listSyncQueueItems(),
      ]);
      setStats(nextStats);
      setItems(nextItems);
    } catch (discardError) {
      setError(
        discardError instanceof Error
          ? discardError.message
          : buildRetryableErrorMessage("descartar el item de la cola"),
      );
    } finally {
      setWorking(false);
    }
  }

  const hasErrors = stats.failed > 0 || stats.abandoned > 0 || stats.conflicted > 0;

  return (
    <section
      className={`px-4 py-3 ${
        hasErrors ? "hce-alert-warning" : "hce-alert-success"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Estado de sincronizacion</p>
          <p className="mt-1">
            Pendientes: {stats.pending} · Fallidos: {stats.failed} · Abandonados: {stats.abandoned} · Conflictos: {stats.conflicted}
          </p>
          <p className="mt-1 text-xs">
            Conexion: {isOnline ? "En linea" : "Sin conexion"}
            {lastSync ? ` · Ultima sincronizacion: ${formatTimestamp(lastSync.at)}` : " · Sin sincronizacion registrada"}
          </p>
          {lastSync ? (
            <p className="mt-1 text-xs">
              Resultado ultimo intento: procesados {lastSync.summary.processed}, exitosos {lastSync.summary.succeeded}, fallidos {lastSync.summary.failed}, conflictos {lastSync.summary.conflicted}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink hover:bg-card/80 transition"
          >
            {expanded ? "Ocultar cola" : "Ver cola"}
          </button>
          <button
            type="button"
            onClick={() => void handleRetryNow()}
            disabled={working || !isOnline}
            className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white disabled:opacity-60 hover:opacity-90 transition"
          >
            Sincronizar ahora
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 hce-alert-error">
          {error}
        </p>
      ) : null}

      {expanded && hasItems ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur-md">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">No hay elementos en cola.</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <article key={item.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink">
                      {item.action.toUpperCase()} · {item.table_name} · {item.status}
                    </p>
                    <p className="text-xs text-ink-soft">{item.record_id}</p>
                    <p className="text-xs text-ink-soft/80">
                      {formatTimestamp(item.client_timestamp)} · intentos {item.retry_count}
                    </p>
                    {item.last_error ? (
                      <p className="text-xs text-red-500">{item.last_error}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDiscard(item.id)}
                      disabled={working}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-red-600 disabled:opacity-60 hover:bg-red-500/20 transition"
                    >
                      Descartar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {expanded && !hasItems ? (
        <div className="mt-4 rounded-xl border border-border bg-card/70 p-4 text-sm text-ink-soft backdrop-blur-md">
          No hay elementos pendientes en la cola. Puedes usar &quot;Sincronizar ahora&quot; para forzar un intento de verificacion.
        </div>
      ) : null}
    </section>
  );
}
